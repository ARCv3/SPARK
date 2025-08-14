import { CommandInteraction } from "discord.js";
import { GuardFunction } from "discordx";
import { useBlacklist } from "../hooks/useBlacklist.js";

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

    const blacklistCondition = await getBlacklist(
        interactionParams.guildId?? "0", 
        interactionParams.user.id, 
        interactionParams.commandName
    );

    if (blacklistCondition) {
        next();
    }

    interactionParams.reply({
        content: "You are blacklisted from using that command!",
        flags: [
            "Ephemeral"
        ]
    })

}