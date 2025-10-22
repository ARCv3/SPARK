import { Logger } from "pino";
import { ModmailRepo } from "../repositories/ModmailRepo.js";
import { Arc3 } from "../arc3.js";
import { useBlacklist } from "../hooks/useBlacklist.js";
import { Locale, useTextContent } from "../hooks/useTextContent.js";
import { BuildModmailMenuEmbed, initModmailAsync, TryCleanupModmail } from "../util/ModmailUtils.js";
import { ButtonInteraction, StringSelectMenuInteraction, TextChannel } from "discord.js";
import { ModmailSentEmbed } from "../../ui/ModmailUi.js";


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
            interaction.client, 
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

            const modmailMenu = await BuildModmailMenuEmbed(interaction.client, modmail);

            await modmailChannel.send(modmailMenu);
            
        })
        .catch(async (e) => {
            
            // Try and find and cleanup the modmail
            await TryCleanupModmail(interaction, e, this.logger);      
        });
    }
   

    public async ProcessModmailSaveButton(interaction: ButtonInteraction) {
        
        const modmailId = interaction.customId.split(".")[2];
        const modmails = await this.modmailRepo.getActiveModmails();

        await interaction.editReply({
            content: "Saving modmail..."
        });

    }

}