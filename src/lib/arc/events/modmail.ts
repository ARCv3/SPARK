import { ArgsOf, Client, Discord, On, SelectMenuComponent } from "discordx";
import { Arc3 } from "../arc3.js";
import { ActionRowBuilder, ComponentEmojiResolvable, Message, MessageActionRowComponentBuilder, StringSelectMenuBuilder, StringSelectMenuInteraction, StringSelectMenuOptionBuilder } from "discord.js";
import Modmail from "../schema/v1/Modmail.js";
import { Cacheables } from 'cacheables';
import { Logger } from "pino";

import { useGuildConfig } from "../hooks/useGuildConfig.js";

@Discord()
export class ModmailEvents {

    private logger : Logger;
    private modmailCache : Cacheables;
    
    /**
     * ModmailEvents class constructor
     * Initializes the logger and modmail cache.
     * @constructor
     */
    constructor() {

        this.logger = Arc3.Arc3.clientLogger.child("ModmailEvents");

        this.modmailCache = new Cacheables({
            log: false,
            logTiming: false
        });
        
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
        return this.modmailCache.cacheable(async () => {
            return await Modmail.find()
        }, 'activemodmails', { cachePolicy: 'cache-only'})
    }

    /**
     * Clears the cached active modmails.
     * This method is used to refresh the cache when needed.
     */
    private clearActiveModmails = () => {
        this.modmailCache.delete('activemodmails');
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

        this.ProcessModmailMessageRecieved(message)
          .catch( e => this.logger.error(e) );

    }

    @SelectMenuComponent({ id: "modmail.select.server"})
    async handleModmailSelectMenu(interaction: StringSelectMenuInteraction) {
        
        await interaction.deferReply();

        const selectedGuildId = interaction.values[0];
        const guild = await interaction.client.guilds.fetch(selectedGuildId);

        
    




    }

    /**
     * Processes a modmail message received.
     * It checks if the message is in a DM channel and processes it accordingly.
     * @param {Message} message - The message object to process.
     */
    private async ProcessModmailMessageRecieved(this: ModmailEvents, message: Message) {

        if (message.channel.isDMBased())
            return await this.ProcessModmailDmMessageRecieved(message);

    }

    /**
     * Processes a modmail message received in a DM channel.
     * It checks if the user has an active modmail and processes the message accordingly.
     * If no active modmail is found, it handles the creation of a new modmail.
     * @param {Message} message - The message object to process.
     */
    private async ProcessModmailDmMessageRecieved(this: ModmailEvents, message: Message) {
        
        const modmails = await this.getActiveModmails();

        this.logger.info(modmails)

        if (modmails.map(x => x.usersnowflake.toString()).includes(message.author.id))
            await this.ProcessModmailMessageToGuild(
                message,  
                modmails.filter(x => x.usersnowflake.toString() === message.author.id)[0]
            );

        else
            await this.HandleNewModmail(message);

    }

    /**
     * Processes a modmail message and sends it to the corresponding guild.
     * This method is called when an active modmail is found for the user.
     * @param {Message} message - The message object to process.
     * @param {any} modmail - The modmail object associated with the user.
     */
    private async ProcessModmailMessageToGuild(this: ModmailEvents, message: Message, modmail: any) {
        
        this.logger.info("Send modmail to guild");

    }

    /**
     * Handles the creation of a new modmail when no active modmail is found for the user.
     * It sends a message to the user with a select menu to choose a server for modmail.
     * @param {Message} message - The message object to process.
     */
    private async HandleNewModmail(this: ModmailEvents, message: Message) {

        if (!(message.content.includes("mod") || message.content.includes("mail")))
            return;

        this.logger.info("Create new Modmail");

        const selectMenuOptions = await this.BuildModmailSelectMenu();
        const selectMenuBuilder = new StringSelectMenuBuilder()
            .addOptions(selectMenuOptions)
            .setCustomId("modmail.select.server");
        const buttonRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
            .addComponents(selectMenuBuilder);

        await message.author.send({
            components: [buttonRow],
            content: "Select a server to modmail: "
        })

    }   

    /**
     * Builds a select menu with options for each server that has modmail enabled.
     * It fetches the guilds from the client and checks their configurations.
     * @returns {Promise<Array>} A promise that resolves to an array of select menu options.
     */
    private async BuildModmailSelectMenu(this: ModmailEvents) {

        const guilds = await Arc3.Arc3.clientInstance.guilds.cache;
        const { buildCache } = useGuildConfig().actions;
        const guildConfigs = await buildCache();
        
        const selectMenuOptions = [];
        
        for ( const [guildId, guild] of guilds) {

            if (!(guild.id in guildConfigs))
                continue;

            if (!("modmailchannel" in guildConfigs[guild.id]))
                continue;

            const fetchedGuild = await guild.fetch();
            const emojis = await fetchedGuild.emojis.fetch();
            const emoji = emojis.find( x => x.name === "arc_icon");

            const option = new StringSelectMenuOptionBuilder()
                .setEmoji(emoji ? {name: emoji.name, id: emoji.id, animated: emoji.animated} as ComponentEmojiResolvable :  {})
                .setDefault(false)
                .setLabel(guild.name)
                .setValue(guild.id)
                .setDescription(
                    fetchedGuild.description
                    ? (fetchedGuild.description.length > 90 
                        ? fetchedGuild.description.substring(0, 90) + "..."
                        : fetchedGuild.description )
                    : "..."
                );

            selectMenuOptions.push(option.toJSON());

        }

        return selectMenuOptions;
    }

}
