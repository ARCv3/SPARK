import Modmail from "../schema/v1/Modmail";
import Transcript from "../schema/v1/Transcript";


export async function CreateTranscript(
    modmail: InstanceType<typeof Modmail>, 
    senderSnowflake: string,
    attachments: string[],
    createdAt: Date,
    messageContent: string,
    guildSnowflake: string,
    transcripttype: string,
    comment: boolean
) {

    const transcript = new Transcript({
        modmailId: modmail._id?.toString(),
        senderSnowflake: senderSnowflake,
        attachments: attachments,
        createdAt: createdAt,
        GuildSnowflake: guildSnowflake,
        messageContent: messageContent,
        transcripttype: transcripttype,
        comment: comment
    });

    await transcript.save();
    return transcript;

}