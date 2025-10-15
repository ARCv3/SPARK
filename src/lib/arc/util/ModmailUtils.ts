import { 
    ActionRow,
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    Client, 
    ComponentEmojiResolvable,
    EmbedBuilder,
    Guild, 
    Message, 
    MessageActionRowComponentBuilder,
    MessageComponentInteraction,
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder,
    TextChannel,
    User,
    Webhook 
} from "discord.js";

import Modmail from "../../schema/v1/Modmail.js";

import mongoose from 'mongoose';
import mongooseLong from 'mongoose-long'
import { useGuildConfig } from "../../hooks/useGuildConfig.js";
import { useActiveModmails } from "../../hooks/useActiveModmails.js";
import { Arc3 } from "../arc3.js";
import { Locale, useTextContent } from "../../hooks/useTextContent.js";
import { title } from "process";
import { Logger } from "pino";


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
    const { actions: { buildCache }, states: {activeModmailsCache} } = useActiveModmails();
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
    
    const mailChannel = await guild.channels.create({
        name: `${text('arc.modmail.channel.name')}-${user.username}`,
        type:  ChannelType.GuildText,
        parent: modmailCategory?.id

    });

    const webhook = await mailChannel.createWebhook({
        name: user.username
    });

    const modmail = new Modmail({
        _id: ObjectId.createFromTime(new Date().getTime()),
        usersnowflake: Long.fromString(user.id),
        channelsnowflake: Long.fromString(mailChannel.id), 
        webhooksnowflake: Long.fromString(webhook.id)
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

    const embedBuilder = new EmbedBuilder();
    const { text } = useTextContent(Locale.EN).actions;

    const user = await clientInstance.users.fetch(modmail.usersnowflake?.toString()?? "0", {
        cache: false
    });

    const embedStrings = {
        footer: text('arc.modmail.menu.footer', Arc3.Arc3.clientVersion),
        title: text('arc.modmail.menu.title'),
        description: text('arc.modmail.menu.description', user.id.toString()),
        buttons: {
            save: {
                text: text('arc.modmail.menu.button.save'),
                emoji: text('arc.modmail.menu.button.save.emoji')
            },
            ban: {
                text: text('arc.modmail.menu.button.ban'),
                emoji: text('arc.modmail.menu.button.ban.emoji')
            },
            ping: {
                text: text('arc.modmail.menu.button.ping'),
                emoji: text('arc.modmail.menu.button.ping.emoji')
            }
        }
    }

    embedBuilder.setTimestamp(new Date());
    embedBuilder.setFooter({
        text: embedStrings.footer,
        iconURL: clientInstance.user?.avatarURL() ?? undefined
    });
    
    embedBuilder.setTitle(embedStrings.title);
    embedBuilder.setDescription(embedStrings.description);

    const buttonRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`modmail.save.${modmail._id?.toString()}`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(embedStrings.buttons.save.emoji)
                .setLabel(embedStrings.buttons.save.text),
            new ButtonBuilder()
                .setCustomId(`modmail.ban.${modmail._id?.toString()}`)
                .setStyle(ButtonStyle.Danger)
                .setEmoji(embedStrings.buttons.ban.emoji)
                .setLabel(embedStrings.buttons.ban.text),
            new ButtonBuilder()
                .setCustomId(`modmail.ping.${modmail._id?.toString()}`)
                .setStyle(ButtonStyle.Success)
                .setEmoji(embedStrings.buttons.ping.emoji)
                .setLabel(embedStrings.buttons.ping.text)
    );

    return {
        embeds: [embedBuilder.toJSON()],
        components: [buttonRow]
    }

}

export function BuildModmailSentEmbed() {

    const embedBuilder = new EmbedBuilder();
    const self = Arc3.Arc3.clientInstance.user;
    const { text } = useTextContent(Locale.EN).actions;
    
    if (!self)
        throw new Error("Client user is not initialized.")

    embedBuilder.setAuthor({
        name: self.username,
        iconURL: self.avatarURL()?? undefined
    });

    embedBuilder.setDescription(text('arc.modmail.delivery.recieved.description'));

    embedBuilder.setFooter({
        text: text('arc.modmail.delivery.recieved.footer'),
        iconURL: self.avatarURL()?? undefined,
    });

    embedBuilder.setTimestamp(new Date());

    return embedBuilder.data;
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
            embeds: [
                new EmbedBuilder()
                    .setTitle("Modmail Failed")
                    .setDescription("Your modmail failed to create. Please try again later.")
                    .setColor("Red")
            ]
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