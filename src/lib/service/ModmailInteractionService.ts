import { Logger } from "pino";
import { ModmailRepo } from "../repositories/ModmailRepo.js";
import { Arc3 } from "../arc3.js";
import { useBlacklist } from "../hooks/useBlacklist.js";
import { Locale, useTextContent } from "../hooks/useTextContent.js";
import { initModmailAsync, LogModmailTranscript, TryCleanupModmail } from "../util/ModmailUtils.js";
import { ButtonInteraction, StringSelectMenuInteraction, TextChannel } from "discord.js";
import { ModmailMenuEmbed, ModmailSentEmbed } from "../../ui/ModmailUi.js";
import Modmail from "../schema/v1/Modmail.js";


export class ModmailInteractionService {

    private logger: Logger;
    private modmailRepo: ModmailRepo;

    constructor(modmailRepo: ModmailRepo) {
        this.logger = Arc3.Arc3.clientLogger.child("ModmailInteractionService");
        this.modmailRepo = modmailRepo;
    }

    /**
     * Handles the modmail server selection interaction.
     * @param interaction The StringSelectMenuInteraction object.
     * @returns {Promise<void>}
     */
    public async ProcessModmailServerSelection(interaction: StringSelectMenuInteraction) {

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
            guild, 
            interaction.user
        ).then(async (modmail) => {

            if (modmail === undefined) {
                throw new Error("Modmail init unsucessfull", modmail);
            }

            await interaction.editReply({
                embeds: [ModmailSentEmbed()]
                // TODO: close button
            });

            const modmailChannel = ( await interaction.client.channels
                    .fetch(modmail.channelsnowflake?.toString() ?? "0")
            ) as TextChannel;

            const modmailMenu = ModmailMenuEmbed(modmail.usersnowflake?.toString()?? "0", modmail._id?.toString())

            await modmailChannel.send(modmailMenu);
            
        })
        .catch(async (e) => {
            
            // Try and find and cleanup the modmail
            await TryCleanupModmail(interaction, interaction.user.id, e);      
        });
    }
   
    /**
     * Processes the modmail save button interaction.
     * @param interaction The ButtonInteraction object.
     * @returns {Promise<void>}
     */
    public async ProcessModmailSaveButton(interaction: ButtonInteraction) {

        if (!interaction.guild) {
            this.logger.warn(`Modmail save button interaction received outside of a guild by user ${interaction.user.tag}`);
            return;
        }
        
        const modmailId = interaction.customId.split(".")[2];
        const modmails : InstanceType<typeof Modmail>[] = await this.modmailRepo.getActiveModmails();

        const modmail = modmails.find(m => m._id?.toString() === modmailId);

            if (!modmail) {
                this.logger.warn(`Modmail with ID: ${modmailId} not found for user ${interaction.user.tag}`);
                await interaction.reply({
                    content: "Modmail session not found or already closed.",
                    ephemeral: true
                });
            return;
        }

        // Log the transcript saving attempt
        this.logger.info(`User ${interaction.user.tag} is attempting to save transcript for modmail ID: ${modmailId}`);
        await LogModmailTranscript(interaction.guild, modmail.usersnowflake?.toString() ?? "0", interaction.user.id);

        // Close the modmail
        await TryCleanupModmail(interaction, modmail.usersnowflake?.toString()?? "0", undefined, false, {
            _id: modmail._id
        })

    }

}