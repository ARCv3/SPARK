import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageActionRowComponentBuilder, User } from "discord.js";
import { Locale, useTextContent } from "../lib/hooks/useTextContent.js";
import { Arc3 } from "../lib/arc3.js";

export function ModmailSentEmbed() {

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

    return embedBuilder.toJSON();
}

export function ModmailMenuEmbed( userId: string, modmailId: string | undefined) {

    const clientUser = Arc3.Arc3.clientInstance.user;
    const embedBuilder = new EmbedBuilder();
    const { text } = useTextContent(Locale.EN).actions;

    const embedStrings = {
        footer: text('arc.modmail.menu.footer', Arc3.Arc3.clientVersion),
        title: text('arc.modmail.menu.title'),
        description: text('arc.modmail.menu.description', userId),
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
        iconURL: clientUser?.avatarURL() ?? undefined
    });
    
    embedBuilder.setTitle(embedStrings.title);
    embedBuilder.setDescription(embedStrings.description);

    const buttonRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`modmail.save.${modmailId}`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(embedStrings.buttons.save.emoji)
                .setLabel(embedStrings.buttons.save.text),
            new ButtonBuilder()
                .setCustomId(`modmail.ban.${modmailId}`)
                .setStyle(ButtonStyle.Danger)
                .setEmoji(embedStrings.buttons.ban.emoji)
                .setLabel(embedStrings.buttons.ban.text),
            new ButtonBuilder()
                .setCustomId(`modmail.ping.${modmailId}`)
                .setStyle(ButtonStyle.Success)
                .setEmoji(embedStrings.buttons.ping.emoji)
                .setLabel(embedStrings.buttons.ping.text)
    );

    return {
        embeds: [embedBuilder.toJSON()],
        components: [buttonRow]
    }

}

export function ModmailFailedEmbed() {

    const { text } = useTextContent(Locale.EN).actions;

    const embedStrings = {
        title: text('arc.modmail.failed.title'),
        description: text('arc.modmail.failed.description')
    }

    return new EmbedBuilder()
        .setTitle(embedStrings.title)
        .setDescription(embedStrings.description)
        .setColor("Red");
}

export function ModmailTranscriptEmbed(userSnowflake: string, savedBySnowflake: string, transcriptUrl:string, savedAt: Date = new Date()) {

    const clientUser = Arc3.Arc3.clientInstance.user;
    const { text } = useTextContent(Locale.EN).actions;

    const embedStrings = {
        title: text('arc.modmail.transcript.title'),
        description: text('arc.modmail.transcript.description', userSnowflake, Math.trunc(savedAt.getTime()/1000).toString(), savedBySnowflake, transcriptUrl),
        footer: text('arc.modmail.menu.footer', Arc3.Arc3.clientVersion),
    }

    return new EmbedBuilder()
        .setTitle(embedStrings.title)
        .setDescription(embedStrings.description)
        .setFooter({
            iconURL: clientUser?.avatarURL() ?? undefined,
            text: embedStrings.footer
        });

}

export function ModmailModeratorMessageEmbed(authorName: string, authorAvatarUrl: string, content: string) {

    const clientUser = Arc3.Arc3.clientInstance.user;
    const { text } = useTextContent(Locale.EN).actions;

    const embedStrings = {
        footer: text('arc.modmail.menu.footer', Arc3.Arc3.clientVersion)
    }

    return new EmbedBuilder()
        .setAuthor({
            name: authorName,
            iconURL: authorAvatarUrl
        })
        .setDescription(content)
        .setFooter({
            iconURL: clientUser?.avatarURL() ?? undefined,
            text: embedStrings.footer
        })
        .setTimestamp(new Date())
        .setColor(0x5865F2);
}
