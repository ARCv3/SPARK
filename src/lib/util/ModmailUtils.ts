import { Arc3 } from "../arc3.js";

import { 
    ActionRowBuilder, 
    ChannelType, 
    ComponentEmojiResolvable,
    Guild, 
    Message, 
    MessageActionRowComponentBuilder,
    MessageComponentInteraction,
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder,
    User,
    Webhook 
} from "discord.js";

import Modmail from "../schema/v1/Modmail.js";

import { useGuildConfig } from "../hooks/useGuildConfig.js";
import { Locale, useTextContent } from "../hooks/useTextContent.js";
import { CreateTextChannel, CreateWebhook } from "./DiscordUtils.js";
import { ModmailFailedEmbed, ModmailMenuEmbed, ModmailTranscriptEmbed } from "../../ui/ModmailUi.js";

import mongoose from 'mongoose';
import mongooseLong from 'mongoose-long'
import { ModmailRepo } from "../repositories/ModmailRepo.js";
mongooseLong(mongoose);
const { Types: { Long, ObjectId} } = mongoose;

const logger = Arc3.Arc3.clientLogger.child("ModmailUtils");

/**
 * Initializes modmail for a user in a guild.
 * 
 * @param clientInstance - The Discord client instance.
 * @param guild - The guild where modmail is to be initialized.
 * @param user - The user for whom modmail is to be initialized.
 * @returns A promise that resolves to true if modmail was successfully initialized, false otherwise.
 * 
 */
export async function initModmailAsync(guild: Guild, user: User, modmailRepo: ModmailRepo) : Promise<InstanceType<typeof Modmail> | undefined> {

    const { getGuildConfig } = useGuildConfig().actions;
    const { text } = useTextContent(Locale.EN).actions;
    
    const guildConfig = await getGuildConfig(guild.id);

    if (!("modmailchannel" in guildConfig)) {
        logger.warn("Guild %s does not have a modmail channel configured. Failed to init modmail", guild.id);
        return undefined;
    }

    const modmailCategorySnowflake = guildConfig["modmailchannel"];
    const modmailCategory = await guild.channels.fetch(modmailCategorySnowflake, {
        cache: false
    });

    if (modmailCategory?.type !== ChannelType.GuildCategory) {
        logger.warn("Guild %s modmail channel is not a category. Failed to init modmail", guild.id);
        return undefined;
    }
    
    const activeModmails = await modmailRepo.getActiveModmails()

    if (activeModmails.map(x => x.usersnowflake?.toString()).includes(user.id)) {
        logger.warn("User %s already has an active modmail. Failed to init modmail", user.id);
        return undefined;
    }
    
    const mailChannel = await CreateTextChannel(
        guild,
        `${text('arc.modmail.channel.name')}-${user.username}`,
        { parent: modmailCategory?.id}
    );

    const webhook = await CreateWebhook(
        mailChannel,
        user.username
    );

    const modmail = await modmailRepo.CreateModmail(
        user.id,
        mailChannel.id, 
        webhook.id
    );

    return modmail;
    
}

/**
 * Builds a select menu with options for each server that has modmail enabled.
 * It fetches the guilds from the client and checks their configurations.
 * @returns {Promise<Array>} A promise that resolves to an array of select menu options.
 */
export async function BuildModmailSelectMenu() {

    const guilds = await Arc3.Arc3.clientInstance.guilds.cache;
    const { buildCache } = useGuildConfig().actions;
    const guildConfigs = await buildCache();
    const selectMenuOptions = [];
    
    for ( const [guildId, guild] of guilds) {

        if (!(guildId in guildConfigs))
            continue;

        if (!("modmailchannel" in guildConfigs[guildId]))
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

/**
 * Sends the message content and attachments to the specified webhook.
 * @param message The message to send.
 * @param webhook The webhook to send the message to.
 */
export async function SendAttachmentsAndMessageToWebhook(message: Message, webhook: Webhook) {

    if (message.attachments.size > 0) {
        message.attachments.forEach(async (attachement) => {
            await webhook.send({
                content: attachement.proxyURL,
                avatarURL: message.author.avatarURL()?? undefined
            });
        });
    }

    if (message.content) {
        const webhookMessage = await webhook.send({
            content: message.content,
            avatarURL: message.author.avatarURL()?? undefined,
            isMessage: true
        });

        return webhookMessage.id;
    }

}

/**
 * Sends a modmail select menu to the user.
 * @param message The message to send the modmail select menu to.1
 */
export async function SendModmailSelectMenu(message: Message<boolean>) {

    const { text } = useTextContent(Locale.EN).actions;

    const selectMenuOptions = await BuildModmailSelectMenu();
    const selectMenuBuilder = new StringSelectMenuBuilder()
        .addOptions(selectMenuOptions)
        .setCustomId("modmail.select.server");
    const buttonRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
        .addComponents(selectMenuBuilder);

    await message.author.send({
        components: [buttonRow],
        content: text('arc.modmail.menu.select.placeholder')
    });

}

export async function LogModmailTranscript(guild: Guild, userSnowflake: string, savedBySnowflake: string) {

    const { getGuildConfig } = useGuildConfig().actions;
    const guildConfig = await getGuildConfig(guild.id);

    if (!("transcriptchannel" in guildConfig)) {
        logger.warn("Guild %s does not have a transcript channel configured. Failed to save transcript", guild.id);
        return;
    }

    const transcriptChannelSnowflake = guildConfig['transcriptchannel'];
    const transcriptChannel = await guild.channels.fetch(transcriptChannelSnowflake, {
        cache: false
    });

    if (!(transcriptChannel && transcriptChannel.type === ChannelType.GuildText)) {
        logger.warn("Guild %s transcript channel is not a text channel or does not exist. Failed to save transcript", guild.id);
        return undefined;
    }

    const transcriptUrl = 'https://example.com/transcript/' + userSnowflake; // Placeholder URL

    await transcriptChannel.send({
        embeds: [ModmailTranscriptEmbed(userSnowflake, savedBySnowflake, transcriptUrl)]
    });

}

export async function TryCleanupModmail(interaction: MessageComponentInteraction, userSnowflake: string, error: any = null, failed: boolean = true, options: Partial<InstanceType<typeof Modmail>>= {}) {

    const recentTimestamp = new Date(); 
    recentTimestamp.setSeconds(recentTimestamp.getSeconds() - 30);

    const modmails = await Modmail.find({
        usersnowflake: Long.fromString(userSnowflake),
        ...options as any,
        createdAt: failed? { $gte: recentTimestamp } : { $lte: new Date()}
    });

    const modmail = modmails[0];

    if (modmail) {

        // Delete the channel (also deletes the webhook)
        const channel = await interaction.client.channels.fetch(modmail.channelsnowflake?.toString() ?? "0");

        if (channel) {
            await channel.delete("Failed modmail creation cleanup").catch(e => {
                logger.error(e, "Failed to delete modmail channel after failed creation");
            });
        }

        if (failed) {
            // Send a message to the user
            await interaction.user.send({
                embeds: [ModmailFailedEmbed()]
            }).catch(e => {
                logger.error(e, "Failed to send modmail failed message to user");
            });
        }
  

        // Delete the modmail
        await modmail.deleteOne().catch(e => {
            logger.error(e, "Failed to delete modmail from database");
        });

        return

    }

    logger.error(error, "Failed to cleanup modmail");
}