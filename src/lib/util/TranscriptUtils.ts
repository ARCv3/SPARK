import Modmail from "../schema/v1/Modmail.js";
import Transcript from "../schema/v1/Transcript.js";


export async function CreateTranscript(
    modmail: InstanceType<typeof Modmail>, 
    senderSnowflake: string,
    attachments: string[],
    createdAt: Date,
    messageContent: string,
    guildSnowflake: string,
    transcriptType: string,
    comment: boolean
) {

    const transcript = new Transcript({
        modmailId: modmail._id?.toString(),
        sendersnowflake: senderSnowflake,
        attachments: attachments,
        createdat: createdAt,
        GuildSnowflake: guildSnowflake,
        messagecontent: messageContent,
        transcripttype: transcriptType,
        comment: comment
    });

    await transcript.save();
    return transcript;

}