import { CommandInteraction } from "discord.js";
import { GuardFunction } from "discordx";
import { useBlacklist } from "../../hooks/useBlacklist.js";
import { Locale, useTextContent } from "../../hooks/useTextContent.js";

/**
 * Blacklist guard to prevent blacklisted users from using certain commands
 * @param interactionParams 
 * @param client 
 * @param next 
 */
export const Blacklist: GuardFunction<CommandInteraction> = async (
    interactionParams,
    client,
    next
)  => {

    const { getBlacklist } = useBlacklist().actions;
    const { text } = useTextContent(Locale.EN).actions;

    const blacklistCondition = await getBlacklist(
        interactionParams.guildId?? "0", 
        interactionParams.user.id, 
        interactionParams.commandName
    );

    if (!blacklistCondition) {
        next();
        return;
    }

    await interactionParams.reply({
        content: text('arc.blacklist'),
    })

}