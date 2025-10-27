import { ApplicationCommandOptionType, AutocompleteInteraction, InteractionCallback, SlashCommandStringOption, type CommandInteraction } from "discord.js";
import { Discord, Guard, Slash, SlashOption } from "discordx";
import { useGuildConfig } from "../../hooks/useGuildConfig.js";
import { Blacklist } from "../guards/blacklist.js";
import { Locale, useTextContent } from "../../hooks/useTextContent.js";
import SetConfigKeyAutoComplete from "../autocomplete/setConfigKeyAutoComplete.js";

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
      type: ApplicationCommandOptionType.String,
      autocomplete: SetConfigKeyAutoComplete
    })
    key: string,
    @SlashOption({
      description: "Config value",
      name: "value",
      required: true,
      type: ApplicationCommandOptionType.String,
    })
    value: string,
    interaction: CommandInteraction) {

    await interaction.deferReply();

    const { setConfig } = useGuildConfig().actions;
    const { text } = useTextContent(Locale.EN).actions;

    await setConfig(interaction.guildId?? "0", key, value);

    await interaction.editReply({
      content: text('arc.command.setconfig.sucess'),
    });

  }

}
