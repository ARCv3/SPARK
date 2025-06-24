import { dirname, importx } from "@discordx/importer";
import type { Interaction, Message } from "discord.js";
import { IntentsBitField } from "discord.js";
import { Client } from "discordx";
import mongoose from "mongoose";
import { Logger } from "./logger/index.js";
import Guild from "./schema/v1/Guild.js";
import mongooseLong from 'mongoose-long'

mongooseLong(mongoose);

const { Types: { Long, ObjectId} } = mongoose;

export const clientLogger = new Logger("SPARK", 'debug');

export const client = new Client({
  // To use only guild command
  // botGuilds: [(client) => client.guilds.cache.map((guild) => guild.id)],

  // Discord intents
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMessageReactions,
    IntentsBitField.Flags.GuildVoiceStates,
  ],

  // Debug logs are disabled in silent mode
  silent: false,

  logger: clientLogger,

});

client.once("ready", async () => {
  // Make sure all guilds are cached
  const guilds = await client.guilds.fetch();

  if (guilds.size <= 0 ) {
    console.log("No guilds found...")
    return;
  }

  // Synchronize applications commands with Discord
  await client.initApplicationCommands();

  // Connect to MongoDB
  await mongoose
    .connect(process.env.MONGODB_URI?? "none")
    .then(() => clientLogger.info("Connected to Database!"))
    .catch(() => { clientLogger.error("Error connecting to MongoDB")  })

  guilds.forEach(( guild ) => {

      const cachedGuilds = await Guild.find().exec();
      
      if (cachedGuilds.map(x => x.guildsnowflake?.toString()).includes(guild.id))
        return;
      
      await 


  })


  clientLogger.info(`Logged in as ${client.user?.username}`);
  clientLogger.info(`Shard IDs: ${client.shard?.ids}`);
  clientLogger.info(`Recommended Shards: ${Math.round(guilds.size / 25000 )}`);
  clientLogger.info(`Registered ${client.applicationCommands.length} application Commands`);
  clientLogger.info(`Client is a member of ${guilds.size} guilds`)
});

client.on("interactionCreate", (interaction: Interaction) => {
  client.executeInteraction(interaction);
});

async function run() {
  
  // The following syntax should be used in the ECMAScript environment
  await importx(`${dirname(import.meta.url)}/{events,commands}/**/*.{ts,js}`);

  // Let's start the bot
  if (!process.env.TOKEN) {
    throw Error("Could not find TOKEN in your environment");
  }

  // Log in with your bot token
  await client.login(process.env.TOKEN);

}

void run();
