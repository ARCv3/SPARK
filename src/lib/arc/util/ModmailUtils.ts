import { 
    ActionRowBuilder, 
    ChannelType, 
    Client, 
    ComponentEmojiResolvable,
    EmbedBuilder,
    Guild, 
    Message, 
    MessageActionRowComponentBuilder,
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder,
    User,
    Webhook 
} from "discord.js";

import Modmail from "../../schema/v1/Modmail.js";

import mongoose from 'mongoose';
import mongooseLong from 'mongoose-long'
import { useGuildConfig } from "../../hooks/useGuildConfig.js";
import { useActiveModmails } from "../../hooks/useActiveModmails.js";
import { Arc3 } from "../arc3.js";


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
export async function initModmailAsync(clientInstance: Client, guild: Guild, user: User) : Promise<boolean> {

    const { getGuildConfig } = useGuildConfig().actions;
    const { actions: { buildCache }, states: {activeModmailsCache} } = useActiveModmails();

    const activeModmails = await buildCache();
    const guildConfig = await getGuildConfig(guild.id);

    if (activeModmails.map(x => x.usersnowflake.toString()).includes(user.id))
        return false;

    if (!("modmailchannel" in guildConfig))
        return false;

    const modmailCategorySnowflake = guildConfig["modmailchannel"];
    const modmailCategory = await guild.channels.fetch(modmailCategorySnowflake, {
        cache: false
    });

    if (modmailCategory?.type !== ChannelType.GuildCategory)
        return false;
    
    const mailChannel = await guild.channels.create({
        name: `Modmail-${user.username}`,
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

    return true;
    
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
    const selectMenuOptions = await BuildModmailSelectMenu();
    const selectMenuBuilder = new StringSelectMenuBuilder()
        .addOptions(selectMenuOptions)
        .setCustomId("modmail.select.server");
    const buttonRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
        .addComponents(selectMenuBuilder);

    await message.author.send({
        components: [buttonRow],
        content: "Select a server to modmail: "
    });
}

export function BuildModmailSentEmbed() {

    const embedBuilder = new EmbedBuilder();
    const self = Arc3.Arc3.clientInstance.user;
    
    if (!self)
        throw new Error("Client user is not initialized.")

    embedBuilder.setAuthor({
        name: self.username,
        iconURL: self.avatarURL()?? undefined
    });

    embedBuilder.setDescription("Your modmail request was recieved! Please wait and a staff member will assist you shortly.");

    embedBuilder.setFooter({
        text: "v0.1 Thank you for using ARC",
        iconURL: self.avatarURL()?? undefined,
    });

    embedBuilder.setTimestamp(new Date());

    return embedBuilder.data;

}