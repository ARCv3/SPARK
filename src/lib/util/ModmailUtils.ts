import { Arc3 } from "../arc3.js";

import { 
    ActionRowBuilder, 
    ChannelType, 
    Client, 
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
import { useActiveModmails } from "../hooks/useActiveModmails.js";
import { Locale, useTextContent } from "../hooks/useTextContent.js";
import { Logger } from "pino";
import { CreateTextChannel } from "./DiscordUtils.js";
import { ModmailFailedEmbed, ModmailMenuEmbed } from "../../ui/ModmailUi.js";
import { useBlacklist } from "../hooks/useBlacklist.js";

import mongoose from 'mongoose';
import mongooseLong from 'mongoose-long'
mongooseLong(mongoose);
const { Types: { Long, ObjectId} } = mongoose;

/**
 * Initializes modmail for a user in a guild.
 * 
 * @param clientInstance - The Discord client instance.
 * @param guild - The guild where modmail is to be initialized.
 * @param user - The user for whom modmail is to be initialized.
 * @returns A promise that resolves to true if modmail was successfully initialized, false otherwise.
 * 
 */
export async function initModmailAsync(clientInstance: Client, guild: Guild, user: User) : Promise<InstanceType<typeof Modmail> | undefined> {

    const { getGuildConfig } = useGuildConfig().actions;
    const { actions: { buildCache } } = useActiveModmails();
    const { text } = useTextContent(Locale.EN).actions;

    const activeModmails = await buildCache();
    const guildConfig = await getGuildConfig(guild.id);

    if (activeModmails.map(x => x.usersnowflake?.toString()).includes(user.id))
        return undefined;

    if (!("modmailchannel" in guildConfig))
        return undefined;

    const modmailCategorySnowflake = guildConfig["modmailchannel"];
    const modmailCategory = await guild.channels.fetch(modmailCategorySnowflake, {
        cache: false
    });

    if (modmailCategory?.type !== ChannelType.GuildCategory)
        return undefined;
    
    const mailChannel = await CreateTextChannel(
        guild,
        `${text('arc.modmail.channel.name')}-${user.username}`,
        { parent: modmailCategory?.id}
    );

    const webhook = await mailChannel.createWebhook({
        name: user.username
    });

    const modmail = await CreateModmail(user.id, mailChannel.id, webhook.id);

    return modmail;
    
}

export async function CreateModmail(userId: string, channelId: string, webhookId: string) : Promise<InstanceType<typeof Modmail>> {

    const { states: {activeModmailsCache} } = useActiveModmails();

    const modmail = new Modmail({
        _id: ObjectId.createFromTime(new Date().getTime()),
        usersnowflake: Long.fromString(userId),
        channelsnowflake: Long.fromString(channelId),
        webhooksnowflake: Long.fromString(webhookId)
    });

    await modmail.save();
    activeModmailsCache.clear();
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

    const { actions: { getBlacklist }, states: { blacklistCache }}= useBlacklist();
    
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
        await webhook.send({
            content: message.content,
            avatarURL: message.author.avatarURL()?? undefined,
            isMessage: true
        });
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

export async function BuildModmailMenuEmbed(clientInstance: Client, modmail: InstanceType<typeof Modmail>) {

    const user = await clientInstance.users.fetch(modmail.usersnowflake?.toString()?? "0", {
        cache: false
    });

    const menuEmbed = ModmailMenuEmbed(user.id, modmail._id?.toString())

    return  menuEmbed;

}

export async function TryCleanupModmail(interaction: MessageComponentInteraction, e: any, logger: Logger) {
    const recentTimestamp = new Date();
    recentTimestamp.setSeconds(recentTimestamp.getSeconds() - 30);

    const modmails = await Modmail.find({
        usersnowflake: Long.fromString(interaction.user.id),
        createdAt: { $gte: recentTimestamp }
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

        // Send a message to the user
        await interaction.user.send({
            embeds: [ModmailFailedEmbed()]
        }).catch(e => {
            logger.error(e, "Failed to send modmail failed message to user");
        });


        // Delete the modmail
        await modmail.deleteOne().catch(e => {
            logger.error(e, "Failed to delete modmail after failed creation");
        });

    }

    logger.error(e, "Failed to create modmail");
}