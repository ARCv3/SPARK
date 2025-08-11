import { ApplicationCommandOptionType, type CommandInteraction } from "discord.js";
import { Discord, Guard, Slash, SlashOption } from "discordx";
import { useGuildConfig } from "../hooks/useGuildConfig.js";
import { Blacklist } from "../guards/blacklist.js";


@Discord()
export class ConfigCommands {

  @Slash({
    name: "setconfig",
    description: "Set config value"
  })
  @Guard(
    Blacklist
  )
  async setConfig(

    @SlashOption({
      description: "Config key",
      name: "key",
      required: true,
      type: ApplicationCommandOptionType.String
    })
    key: string,
    @SlashOption({
      description: "Config value",
      name: "value",
      required: true,
      type: ApplicationCommandOptionType.String
    })
    value: string,
    interaction: CommandInteraction) {

    const { setConfig } = useGuildConfig().actions;

    setConfig(interaction.guildId?? "0", key, value);
    interaction.reply({
      content: "valid config",
      flags: [
        "Ephemeral"
      ]
    })
  }

}
