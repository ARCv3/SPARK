import { ArgsOf, ButtonComponent, Client, Discord, On, SelectMenuComponent } from "discordx";
import { Arc3 } from "../../arc3.js";
import { ButtonInteraction, StringSelectMenuInteraction } from "discord.js";
import { Logger } from "pino";

import mongoose from 'mongoose';
import mongooseLong from 'mongoose-long'
import { ModmailMessageService } from "../../service/ModmailMessageService.js";
import { ModmailRepo } from "../../repositories/ModmailRepo.js";
import { ModmailInteractionService } from "../../service/ModmailInteractionService.js";

mongooseLong(mongoose);

const { Types: { Long, ObjectId} } = mongoose;

@Discord()
export class ModmailEvents {

    private logger : Logger;
    private modmailMessageService : ModmailMessageService;
    private modmailInteractionService : ModmailInteractionService;
    private modmailRepo: ModmailRepo;
    
    /**
     * ModmailEvents class constructor
     * Initializes the logger and modmail cache.
     * @constructor
     */
    constructor(
        modmailRepo? : ModmailRepo, 
        modmailInteractionService? : ModmailInteractionService, 
        modmailMessageService? : ModmailMessageService
    ) {

        this.logger = Arc3.Arc3.clientLogger.child("ModmailEvents");
        this.modmailRepo = modmailRepo || new ModmailRepo();
        this.modmailMessageService = modmailMessageService || new ModmailMessageService(this.modmailRepo);
        this.modmailInteractionService = modmailInteractionService || new ModmailInteractionService(this.modmailRepo);
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

        this.modmailMessageService.ProcessModmailMessageRecieved(client, message)
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

        this.modmailInteractionService.ProcessModmailServerSelection(interaction)
          .catch( e => this.logger.error(e) );
    }

    @ButtonComponent({ id: new RegExp("modmail\.save\..*") })
    async handleModmailSaveButton(interaction: ButtonInteraction) {

        await interaction.deferReply();

        this.modmailInteractionService.ProcessModmailSaveButton(interaction)
            .catch( e => this.logger.error(e) );

    }


}

