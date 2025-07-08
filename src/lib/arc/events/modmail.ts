import { ArgsOf, Client, Discord, On } from "discordx";
import { Arc3 } from "../arc3.js";
import { Message } from "discord.js";

@Discord()
export class ModmailEvents {

    public readonly logger = Arc3.Arc3.clientLogger.child("modmailEvents")

    @On({ event: "messageCreate" })
    onMessageCreate(
        [message] : ArgsOf<"messageCreate">,
        client: Client,
        guardPayload: any,
    ) {
        
        // Guard if the author is a bot
        if (message.author.bot) 
            return;

        this.ProcessModmailMessageRecieved(message)
          .catch( e => this.logger.error(e) );

    }

    private async ProcessModmailMessageRecieved(this: ModmailEvents, message: Message) {

        if (message.channel.isDMBased())
            return await this.ProcessModmailDmMessageRecieved(message);

    }

    private async ProcessModmailDmMessageRecieved(this: ModmailEvents, message: Message) {
        
        

    }

}
