import { AutocompleteInteraction } from "discord.js";
import { GuildConfigKey } from "../../hooks/useGuildConfig.js";

export function SetConfigKeyAutoComplete(interaction: AutocompleteInteraction) {
    
    const values : string[] = [];

    for (let item in GuildConfigKey) {
        values.push(item)
    }

    // Respond with enum values
    interaction.respond(
        values.map(choice => ({
            name: choice,
            value: choice,
        }))
    );

}

export default SetConfigKeyAutoComplete;