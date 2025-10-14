import { dirname, importx } from "@discordx/importer";
import type { Guild, GuildMember, Interaction, Message } from "discord.js";
import { GatewayDispatchEvents, IntentsBitField, Partials } from "discord.js";
import { Client } from "discordx";
import mongoose from "mongoose";
import { Logger } from "../logger/index.js";
import { default as GuildInfo } from "../schema/v1/Guild.js";
import mongooseLong from 'mongoose-long'
import * as packageJson from '../../../package.json' with { type: 'json'};

mongooseLong(mongoose);
const { Types: { Long, ObjectId} } = mongoose;


export namespace Arc3 {

  export class Arc3 {

    public static clientInstance : Client;
    private readonly clientInstance : Client;
    public static readonly clientLogger = new Logger("SPARK", 'debug');
    public static readonly clientVersion = packageJson.version;

    /**
     * Creates a new instance of the Arc3 class.
     * This class is responsible for initializing the Discord client and handling interactions.
     */
    constructor() {

      Arc3.clientInstance = new Client({

        // To use only guild command
        // botGuilds: [(client) => client.guilds.cache.map((guild) => guild.id)],

        partials: [Partials.Channel, Partials.Message],

        // Discord intents
        intents: [
          IntentsBitField.Flags.Guilds,
          IntentsBitField.Flags.GuildMembers,
          IntentsBitField.Flags.GuildMessages,
          IntentsBitField.Flags.GuildMessageReactions,
          IntentsBitField.Flags.GuildVoiceStates,
          IntentsBitField.Flags.DirectMessages,
        ],

        // Debug logs are disabled in silent mode
        silent: false,

        logger: Arc3.clientLogger,

      });

      this.clientInstance = Arc3.clientInstance;

      this.clientInstance.on('interactionCreate', this.onInteractionCreate);
      this.clientInstance.on('ready', this.onReady);
      this.clientInstance.on('guildMemberAdd', this.onGuildMemberAdd)

    }

    /** 
     * Handles the guild member add event.
     * This method is called when a new member joins a guild.
     * @param member The guild member that was added.
     * @returns {void}
     */
    private onGuildMemberAdd(member: GuildMember) {

        if ( member.user.id !== this.clientInstance.user?.id )
            return;

        Arc3.clientLogger.info("Bot joined a new guild: " + member.guild.name);

        Arc3.NewGuild([], member.guild)
          .then( () => Arc3.clientLogger.info("New guild created in database: " + member.guild.name) )
          .catch( e => Arc3.clientLogger.error("Error creating new guild in database: ", e) );

    }

    /**
     * Handles interaction creation events.
     * @param interaction The interaction that was created.
     */
    private onInteractionCreate(this: Client, interaction: Interaction) {
      this.executeInteraction(interaction);
    }

    /**
     * Handles the ready event of the client.
     * This method is called when the client is ready and connected to Discord.
     * @this {Client} The Discord client instance.
     * @return {Promise<void>} A promise that resolves when the client is ready.
     */
    private async onReady(this: Client) {

      const oAuth2Guilds = await this.guilds.fetch();
      const guilds = await Promise.all(oAuth2Guilds.map((x) => x.fetch()));

      if ( guilds.length <= 0 ) {
        Arc3.clientLogger.info("No Guilds found!");
        return;
      }

      await this.initApplicationCommands();

      mongoose
        .connect(process.env.MONGODB_URI?? "none")
        .then( _ => {
          Arc3.clientLogger.info("Connected to database!");
        })
        .catch( e => Arc3.clientLogger.error("Error connecting to MongoDB") );

      guilds.forEach( async ( guild ) => {

        const cachedGuilds = await GuildInfo.find();

        if ( cachedGuilds.map( x => x.guildsnowflake?.toString() ).includes(guild.id) )
          return;

        await Arc3.NewGuild(cachedGuilds, guild);

      }); 

      // Log the bot's information
      Arc3.clientLogger.info(`Logged in as ${this.user?.username}`);
      Arc3.clientLogger.info(`Shard IDs: ${this.shard?.ids}`);
      Arc3.clientLogger.info(`Recommended Shards: ${Math.round(guilds.length / 25000 )}`);
      Arc3.clientLogger.info(`Registered ${this.applicationCommands.length} application Commands`);
      Arc3.clientLogger.info(`Client is a member of ${guilds.length} guilds`);

    }

    /**
     * Creates a new guild entry in the database.
     * @param guildInfos The list of existing guild information.
     * @param guild The guild to create an entry for.
     * @returns A promise that resolves when the guild entry is created.
     */
    public static async NewGuild(guildInfos: any[], guild: Guild) {

      if ( guildInfos.map( x => x.guildsnowflake?.toString()).includes(guild.id) )
        return;

      const newGuildInfo = new GuildInfo({
        _id: ObjectId.createFromTime(new Date().getTime()),
        guildsnowflake: guild.id,
        premium: false,
        moderators: [],
        ownerid: guild.ownerId
      });

      await newGuildInfo.save();

      // TODO: Welcome Message!! 

    }

    /**
     * Runs the Arc3 bot.
     * This method initializes the bot, loads commands and events, and starts the bot.
     * @returns A promise that resolves when the bot is running.
     */
    public async runAsync() {

      // The following syntax should be used in the ECMAScript environment
      await importx(`${dirname(import.meta.url)}/{events,commands}/**/*.{ts,js}`);

      // Let's start the bot
      if (!process.env.TOKEN) {
        throw Error("Could not find TOKEN in your environment");
      }

      // Log in with your bot token
      await this.clientInstance.login(process.env.TOKEN);

    }

  }

}

