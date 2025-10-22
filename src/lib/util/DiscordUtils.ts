import { ChannelType, Guild, TextChannel } from "discord.js";


export async function CreateTextChannel(guild: Guild, name: string,...options: any) : Promise<TextChannel> {

    return await (guild.channels.create({
        name,
        type: ChannelType.GuildText,
        ...options
    }) as Promise<TextChannel>);

}

