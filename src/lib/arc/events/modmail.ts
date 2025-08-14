import { ArgsOf, Client, Discord, On, SelectMenuComponent } from "discordx";
import { Arc3 } from "../arc3.js";
import { EmbedBuilder, Message, StringSelectMenuInteraction } from "discord.js";
import Modmail from "../../schema/v1/Modmail.js";
import { Logger } from "pino";

import { useBlacklist } from "../../hooks/useBlacklist.js";

import mongoose from 'mongoose';
import mongooseLong from 'mongoose-long'
import { useActiveModmails } from "../../hooks/useActiveModmails.js";
import { BuildModmailSentEmbed, initModmailAsync, SendAttachmentsAndMessageToWebhook, SendModmailSelectMenu } from "../util/ModmailUtils.js";
import { Locale, useTextContent } from "../../hooks/useTextContent.js";

mongooseLong(mongoose);

const { Types: { Long, ObjectId} } = mongoose;

@Discord()
export class ModmailEvents {

    private logger : Logger;
    private activeModmail = useActiveModmails();
    
    /**
     * ModmailEvents class constructor
     * Initializes the logger and modmail cache.
     * @constructor
     */
    constructor() {

        this.logger = Arc3.Arc3.clientLogger.child("ModmailEvents");
    
        this.initCaches().then( _ => {
            this.logger.info("Cache initialized");
        });

    }

    /**
     * Initializes the caches for modmail events.
     * It is called once when the class is instantiated.
     */
    private async initCaches() {
        await this.getActiveModmails();
    }

    /**
     * Retrieves active modmails from the database and caches them.
     * @returns {Promise<Array>} A promise that resolves to an array of active modmails.
     */
    private getActiveModmails = () =>  {
        return this.activeModmail.actions.buildCache();
    }

    /**
     * Event handler for message creation.
     * It processes modmail messages received in DMs.
     * @param {ArgsOf<"messageCreate">} args - The arguments of the messageCreate event.
     * @param {Client} client - The Discord client instance.
     * @param {any} guardPayload - Additional payload for guards (not used here).
     */
    @On({ event: "messageCreate" })
    onMessageCreate(
        [message] : ArgsOf<"messageCreate">,
        client: Client,
        guardPayload: any,
    ) {
        
        // Guard if the author is a bot
        if (message.author.bot) 
            return;

        this.ProcessModmailMessageRecieved(client, message)
          .catch( e => this.logger.error(e) );

    }

    /**
     * Event handler for interaction creation.
     * It handles the modmail select menu interaction.
     * @param {StringSelectMenuInteraction} interaction - The interaction object.
     */
    @SelectMenuComponent({ id: "modmail.select.server"})
    async handleModmailSelectMenu(interaction: StringSelectMenuInteraction) {
        
        await interaction.deferReply()
        const { getBlacklist } = useBlacklist().actions;
        const { text } = useTextContent(Locale.EN).actions;

        const selectedGuildId = interaction.values[0];
        const guild = await interaction.client.guilds.fetch(selectedGuildId);
        
        const isBlacklsted = await getBlacklist(guild.id, interaction.user.id, "modmail");
        
        if (isBlacklsted) {
            return await interaction.user.send({
                content: text('arc.modmail.blacklisted')
            });
        }

        initModmailAsync(
            interaction.client, 
            guild, 
            interaction.user
        ).then(async (success) => {

            if (!success)
                throw new Error("Modmail init unsucessfull")

            await interaction.editReply({
                embeds: [BuildModmailSentEmbed()]
                // TODO: close button
            });
        })
        .catch(e => {
            this.logger.error(e, "Failed to create modmail");      
        })
   
    }

    /**
     * Processes a modmail message received.
     * It checks if the message is in a DM channel and processes it accordingly.
     * @param {Message} message - The message object to process.
     */
    private async ProcessModmailMessageRecieved(this: ModmailEvents, client: Client, message: Message) {

        if (message.channel.isDMBased())
            return await this.ProcessModmailDmMessageRecieved(client, message);

    }

    /**
     * Processes a modmail message received in a DM channel.
     * It checks if the user has an active modmail and processes the message accordingly.
     * If no active modmail is found, it handles the creation of a new modmail.
     * @param {Message} message - The message object to process.
     */
    private async ProcessModmailDmMessageRecieved(this: ModmailEvents, client: Client, message: Message) {

        // We need to guard certain dm messages to save performance. 
        // If it is from a bot we can safely ignore
        if (message.author.bot)
            return;
        
        // Get the active modmails
        const modmails = await this.getActiveModmails();
        const usersWithOpenModmail = modmails.map( (x:  InstanceType<typeof Modmail>) => x.usersnowflake.toString());
        
        // Guard that the user has an active modmail
        if (!usersWithOpenModmail.includes(message.author.id)) {
            await this.HandleNewModmail(message);
            return;
        }
        
        if (message.content.toLowerCase() === "close session")
            // TODO Handle close modmail
            return

        // We have established the user has an active modmail, is not a bot, and does not wish to close the session
        await this.ProcessModmailMessageToGuild(
            client,
            message,  
            modmails.filter((x: InstanceType<typeof Modmail>)=> x.usersnowflake.toString() === message.author.id)[0]
        );

    }

    /**
     * Processes a modmail message and sends it to the corresponding guild.
     * This method is called when an active modmail is found for the user.
     * @param {Message} message - The message object to process.
     * @param {any} modmail - The modmail object associated with the user.
     */
    private async ProcessModmailMessageToGuild(this: ModmailEvents, client: Client, message: Message, modmail: InstanceType<typeof Modmail>) {
        
        // Get the active modmail webhook
        const webhook = await client.fetchWebhook(modmail.webhooksnowflake.toString());
        const { text } = useTextContent(Locale.EN).actions;
        
        SendAttachmentsAndMessageToWebhook(message, webhook)
        .then(async () => {
            await message.react(text('arc.modmail.emoji.delivery.delivered'));
        }).catch(async (e) => {
            this.logger.error(e, "Error sending message in modmail: " + modmail._id.toString())
            await message.react(text('arc.modmail.emoji.delivery.failed'));
        });

    }

    /**
     * Handles the creation of a new modmail when no active modmail is found for the user.
     * It sends a message to the user with a select menu to choose a server for modmail.
     * @param {Message} message - The message object to process.
     */
    private async HandleNewModmail(this: ModmailEvents, message: Message) {

        if (!(message.content.includes("mod") || message.content.includes("mail")))
            return;

        this.logger.info("Creating new Modmail");

        await SendModmailSelectMenu(message);

    }   

}

