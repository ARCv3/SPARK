import { ChannelType, ChannelWebhookCreateOptions, Guild, GuildChannelCreateOptions, TextChannel, Webhook } from "discord.js";


export async function CreateTextChannel(guild: Guild, name: string, options?: Partial<GuildChannelCreateOptions>) : Promise<TextChannel> {

    return await (guild.channels.create({
        name,
        type: ChannelType.GuildText,
        ...options
    }) as Promise<TextChannel>);

}

export async function CreateWebhook(channel: TextChannel, name: string, options?: Partial<ChannelWebhookCreateOptions>) : Promise<Webhook> {
    return await channel.createWebhook({
        name, 
        ...options,
    })
}
