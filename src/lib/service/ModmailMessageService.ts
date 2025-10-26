import { Logger } from "pino";
import Modmail from "../schema/v1/Modmail";
import { ModmailRepo } from "../repositories/ModmailRepo";
import { Arc3 } from "../arc3.js";
import { SendAttachmentsAndMessageToUser, SendAttachmentsAndMessageToWebhook, SendModmailSelectMenu } from "../util/ModmailUtils.js";
import { Locale, useTextContent } from "../hooks/useTextContent.js";
import { Message, PartialMessage } from "discord.js";
import { ModmailModeratorMessageEmbed } from "../../ui/ModmailUi.js";


export class ModmailMessageService {

    private logger : Logger;
    private modmailRepo : ModmailRepo;

    constructor(modmailRepo: ModmailRepo) {
        this.logger = Arc3.Arc3.clientLogger.child("ModmailMessageService");
        this.modmailRepo = modmailRepo;
    }

    /**
     * Processes a modmail message received.
     * It checks if the message is in a DM channel and processes it accordingly.
     * @param {Message} message - The message object to process.
     */
    public async ProcessModmailMessageRecieved(this: ModmailMessageService, message: Message) {

        if (message.channel.isDMBased())
            return await this.ProcessModmailDmMessageRecieved(message);

        const activeModmails = await this.modmailRepo.getActiveModmails();

        if (activeModmails.find(m => m.channelsnowflake?.toString() === message.channelId )) {
            return await this.ProcessModmailChannelMessageRecieved(message);
        }

    }

    /**
     * Processes a modmail message update.
     * It checks if the message is in a DM channel and processes it accordingly.
     * @param {Message | PartialMessage} oldMessage - The old message object.
     * @param {Message} newMessage - The new message object.
     * @return {Promise<void>}
     */
    public async ProcessModmailMessageUpdated(this: ModmailMessageService, oldMessage: Message | PartialMessage, newMessage: Message) {

        const { text } = useTextContent(Locale.EN).actions;
        
        if (oldMessage.channel.isDMBased()) {
            const correspondingMessage = this.modmailRepo.getRecentModmailMessageID(oldMessage.id);
            if (!correspondingMessage) {
                return;
            }
            
            this.EditModmailWebhookMessage(oldMessage, newMessage, correspondingMessage)
                .then( async _ => {
                    this.logger.info("Edited modmail webhook message for DM message %s", oldMessage.id);
                    await newMessage.react(text('arc.modmail.delivery.emoji.edited'));
                })
                .catch( e => this.logger.error(e) );
        } else {
            const activeModmails = await this.modmailRepo.getActiveModmails();
            const modmail = activeModmails.find(m => m.channelsnowflake?.toString() === newMessage.channelId);
            
            if (modmail && !newMessage.author.bot) {
                await this.HandleModeratorMessageEdit(oldMessage, newMessage, modmail);
            }
        }

    }

    /**
     * Edits a modmail webhook message when the original message is edited.
     * @param {Message | PartialMessage} oldMessage - The old message object.
     * @param {Message} newMessage - The new message object.
     * @param {string} correspondingMessage - The ID of the corresponding webhook message.
     * @returns {Promise<void>}
     */
    private async EditModmailWebhookMessage(oldMessage: Message | PartialMessage, newMessage: Message, correspondingMessage: string) {
        
        const modmails = await this.modmailRepo.getActiveModmails();
        const modmail = modmails.find( m => m.usersnowflake?.toString() === oldMessage.author?.id );
        
        if (!modmail) {
            this.logger.warn("No active modmail found for user %s when processing updated modmail message", oldMessage.author?.id);
            return;
        }
        
        const webhook  = await Arc3.Arc3.clientInstance.fetchWebhook(modmail?.webhooksnowflake?.toString() ?? "0")

        if (!webhook) {
            this.logger.error("No webhook found for modmail %s when processing updated modmail message", modmail._id?.toString());
            return;
        }

        await webhook.editMessage(correspondingMessage, {
            content: newMessage.content,
            embeds: newMessage.embeds,
            components: newMessage.components
        });

        await this.modmailRepo.CreateTranscript(
            modmail,
            newMessage.author.id,
            newMessage.attachments.map(x => x.proxyURL ),
            newMessage.createdAt,
            newMessage.content,
            newMessage.guildId?? "0",
            "Modmail",
            false,
            oldMessage.id
        )
    }

    /**
     * Handles moderator message edits in modmail.
     * Edits the existing embed in the user's DM and creates a new transcript entry.
     * @param {Message | PartialMessage} oldMessage - The old message object.
     * @param {Message} newMessage - The new message object.
     * @param {InstanceType<typeof Modmail>} modmail - The modmail object.
     */
    private async HandleModeratorMessageEdit(this: ModmailMessageService, oldMessage: Message | PartialMessage, newMessage: Message, modmail: InstanceType<typeof Modmail>) {
        
        const { text } = useTextContent(Locale.EN).actions;
        const correspondingUserMessageId = this.modmailRepo.getRecentModmailMessageID(newMessage.id);

        if (newMessage.content.startsWith('#')) {
            await this.modmailRepo.CreateTranscript(
                modmail,
                newMessage.author.id,
                newMessage.attachments.map(x => x.proxyURL),
                newMessage.createdAt,
                newMessage.content,
                newMessage.guildId ?? "0",
                "Modmail",
                true,
                newMessage.id
            );
            return;
        }

        if (!correspondingUserMessageId) {
            this.logger.warn("No corresponding user message found for moderator message edit %s", newMessage.id);
            return;
        }

        try {
            const user = await Arc3.Arc3.clientInstance.users.fetch(modmail.usersnowflake?.toString() ?? "0");
            const dmChannel = await user.createDM();
            const userMessage = await dmChannel.messages.fetch(correspondingUserMessageId);

            const editedEmbed = ModmailModeratorMessageEmbed(
                newMessage.author.username,
                newMessage.author.displayAvatarURL(),
                newMessage.content
            );
            
            await userMessage.edit({ embeds: [editedEmbed] });
            await newMessage.react(text('arc.modmail.delivery.emoji.edited'));

            await this.modmailRepo.CreateTranscript(
                modmail,
                newMessage.author.id,
                newMessage.attachments.map(x => x.proxyURL),
                newMessage.createdAt,
                newMessage.content,
                newMessage.guildId ?? "0",
                "Modmail",
                false,
                newMessage.id
            );

        } catch (e) {
            this.logger.error(e, "Error editing message in user DM for modmail: " + modmail._id?.toString());
        }
    }

    /**
     * Processes a modmail message received in a modmail channel.
     * It checks if the message is from a bot and processes it accordingly.
     * @param {Message} message - The message object to process.
     * @returns {Promise<void>}
     */
    private async ProcessModmailChannelMessageRecieved(this: ModmailMessageService, message: Message) {
        
        if (message.author.bot)
            return;

        const modmails = await this.modmailRepo.getActiveModmails();
        const modmail = modmails.find(m => m.channelsnowflake?.toString() === message.channelId );
        
        if (!modmail) {
            this.logger.warn("No modmail found for channel %s", message.channelId);
            return;
        }

        // Check if message is a comment (starts with #)
        if (message.content.startsWith('#')) {
            await this.HandleModmailComment(message, modmail);
            return;
        }

        await this.ProcessModmailMessageToUser(message, modmail);
    }

    /**
     * Processes a modmail message received in a DM channel.
     * It checks if the user has an active modmail and processes the message accordingly.
     * If no active modmail is found, it handles the creation of a new modmail.
     * @param {Message} message - The message object to process.
     */
    private async ProcessModmailDmMessageRecieved( this: ModmailMessageService, message: Message) {

        // We need to guard certain dm messages to save performance. 
        // If it is from a bot we can safely ignore
        if (message.author.bot)
            return;
        
        // Get the active modmails
        const modmails = await this.modmailRepo.getActiveModmails();
        const usersWithOpenModmail = modmails.map( (x:  InstanceType<typeof Modmail>) => x.usersnowflake?.toString());
        
        // Guard that the user has an active modmail
        if (!usersWithOpenModmail.includes(message.author.id)) {
            await this.HandleNewModmail(message);
            return;
        }
        
        if (message.content.toLowerCase() === "close session")
            // TODO Handle close modmail
            return

        // We have established the user has an active modmail, is not a bot, and does not wish to close the session
        await this.ProcessModmailMessageToGuild(
            message,  
            modmails.filter((x: InstanceType<typeof Modmail>)=> x.usersnowflake?.toString() === message.author.id)[0]
        );

    }

    /**
     * Processes a modmail message and sends it to the corresponding guild.
     * This method is called when an active modmail is found for the user.
     * @param {Message} message - The message object to process.
     * @param {any} modmail - The modmail object associated with the user.
     */
    private async ProcessModmailMessageToGuild(this: ModmailMessageService, message: Message, modmail: InstanceType<typeof Modmail>) {
        
        // Get the active modmail webhook
        const webhook = await Arc3.Arc3.clientInstance.fetchWebhook(modmail.webhooksnowflake?.toString() ?? "0");
        const { text } = useTextContent(Locale.EN).actions;

        SendAttachmentsAndMessageToWebhook(message, webhook)
        .then(async (webhookMessageID) => {

            if (webhookMessageID)
                this.modmailRepo.addRecentMessage(message.id, webhookMessageID)

            await message.react(text('arc.modmail.delivery.emoji.delivered'));
            await this.modmailRepo.CreateTranscript(
                modmail, 
                message.author.id, 
                message.attachments.map(x => x.proxyURL ), 
                message.createdAt, 
                message.content, 
                message.guildId?? "0", 
                "Modmail", 
                false,
                message.id
            );

        }).catch(async (e) => {
            this.logger.error(e, "Error sending message in modmail: " + modmail._id?.toString())
            await message.react(text('arc.modmail.delivery.emoji.failed'));
        });

    }

    /**
     * Processes a modmail message from moderator to user.
     * @param {Message} message - The message object from the modmail channel.
     * @param {InstanceType<typeof Modmail>} modmail - The modmail object.
     */
    private async ProcessModmailMessageToUser(this: ModmailMessageService, message: Message, modmail: InstanceType<typeof Modmail>) {
        
        const user = await Arc3.Arc3.clientInstance.users.fetch(modmail.usersnowflake?.toString() ?? "0");
        const { text } = useTextContent(Locale.EN).actions;

        SendAttachmentsAndMessageToUser(message, user)
        .then( async ( userMessageId ) => {

            if (userMessageId) {
                this.modmailRepo.addRecentMessage(message.id, userMessageId);
            }

            await message.react(text('arc.modmail.delivery.emoji.delivered'));
            await this.modmailRepo.CreateTranscript(
                modmail,
                message.author.id,
                message.attachments.map(x => x.proxyURL),
                message.createdAt,
                message.content,
                message.guildId ?? "0",
                "Modmail",
                false,
                message.id
            );

        }).catch( async (e) => {
            this.logger.error(e, "Error sending message to user in modmail: " + modmail._id?.toString());
            await message.react(text('arc.modmail.delivery.emoji.failed'));
        });

    }

    /**
     * Handles a comment message in modmail (messages starting with #).
     * Comments are logged but not sent to the user.
     * @param {Message} message - The message object.
     * @param {InstanceType<typeof Modmail>} modmail - The modmail object.
     */
    private async HandleModmailComment(this: ModmailMessageService, message: Message, modmail: InstanceType<typeof Modmail>) {
        
        await this.modmailRepo.CreateTranscript(
            modmail,
            message.author.id,
            message.attachments.map(x => x.proxyURL),
            message.createdAt,
            message.content,
            message.guildId ?? "0",
            "Modmail",
            true,
            message.id
        );

        this.logger.info("Comment added to modmail %s by %s", modmail._id?.toString(), message.author.tag);
    }

    /**
     * Handles the creation of a new modmail when no active modmail is found for the user.
     * It sends a message to the user with a select menu to choose a server for modmail.
     * @param {Message} message - The message object to process.
     */
    private async HandleNewModmail(this: ModmailMessageService, message: Message) {

        if (!(message.content.includes("mod") || message.content.includes("mail")))
            return;

        this.logger.info("Creating new Modmail");

        await SendModmailSelectMenu(message);

    }   

}