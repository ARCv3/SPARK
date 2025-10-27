import { Logger } from "pino";
import { useActiveModmails } from "../hooks/useActiveModmails.js";
import { Arc3 } from "../arc3.js";
import Modmail from "../schema/v1/Modmail.js";

import mongoose from 'mongoose';
import mongooseLong from 'mongoose-long'
import Transcript from "../schema/v2/Transcript.js";

mongooseLong(mongoose);
const { Types: { Long, ObjectId} } = mongoose;


export class ModmailRepo {

    private logger : Logger;
    private activeModmail = useActiveModmails();
    private recentMessagesCache : Record<string, string>;
    
    /**
     * ModmailEvents class constructor
     * Initializes the logger and modmail cache.
     * @constructor
     */
    constructor() {

        this.logger = Arc3.Arc3.clientLogger.child("ModmailRepo");
    
        this.initCaches().then( _ => {
            this.logger.info("Cache initialized");
        });

        this.recentMessagesCache = {

        } as Record<string, string>;

    }

    /**
     * Initializes the caches for modmail events.
     * It is called once when the class is instantiated.
     */
    private async initCaches() {
        await this.getActiveModmails();
    }

    /**
     * Retrieves active modmails from the database and caches them.
     * @returns {Promise<Array>} A promise that resolves to an array of active modmails.
     */
    public getActiveModmails = () =>  {
        return this.activeModmail.actions.buildCache();
    }

    /**
     * Clears the active modmails cache.    
     * @returns {void}
     */
    public clearActiveModmailsCache() {
        const { states: { activeModmailsCache } } = this.activeModmail;
        activeModmailsCache.clear();
    }

    /**
     * Creates a new modmail in the database.
     * @param {string} userId - The user ID.
     * @param {string} channelId - The channel ID.
     * @param {string} webhookId - The webhook ID.
     * @returns {Promise<InstanceType<typeof Modmail>>} A promise that resolves to the created modmail.
     */
    public async CreateModmail(userId: string, channelId: string, webhookId: string) : Promise<InstanceType<typeof Modmail>> {

        const { states: { activeModmailsCache } } = this.activeModmail;

        const modmail = new Modmail({
            _id: ObjectId.createFromTime(new Date().getTime()),
            usersnowflake: Long.fromString(userId),
            channelsnowflake: Long.fromString(channelId),
            webhooksnowflake: Long.fromString(webhookId)
        });

        await modmail.save();
        activeModmailsCache.clear()
        return modmail;

    }

    async CreateTranscript(
        modmail: InstanceType<typeof Modmail>, 
        senderSnowflake: string,
        attachments: string[],
        createdAt: Date,
        messageContent: string,
        guildSnowflake: string,
        transcriptType: string,
        comment: boolean,
        messageId: string,
    ) {

        const transcript = new Transcript({
            modmailId: modmail._id?.toString(),
            sendersnowflake: senderSnowflake,
            attachments: attachments,
            createdat: createdAt,
            GuildSnowflake: guildSnowflake,
            messagecontent: messageContent,
            transcripttype: transcriptType,
            comment: comment,
            messageid: messageId
        });

        await transcript.save();
        return transcript;

    }

    public addRecentMessage(userMessageId: string, modmailMessageId: string) {
        this.recentMessagesCache[userMessageId] = modmailMessageId;
    }

    public getRecentModmailMessageID(userMessageID: string) {
        return this.recentMessagesCache[userMessageID];
    }

    public getRecentUserMessageID(modmailMessageID: string) {
        const entry = Object.entries(this.recentMessagesCache).find( ([_, v]) => v === modmailMessageID);
        return entry ? entry[0] : undefined;
    }
        
}