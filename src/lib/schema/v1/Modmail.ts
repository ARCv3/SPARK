import mongoose from 'mongoose';
import mongooseLong from 'mongoose-long'

mongooseLong(mongoose);

const { Types: { Long, ObjectId } } = mongoose;

const ModmailSchema = new mongoose.Schema({
    _id: ObjectId,
    channelsnowflake: Long,
    webhooksnowflake: Long,
    usersnowflake: Long
}, { timestamps: true });

const Modmail = mongoose.model("Modmail", ModmailSchema);

export default Modmail;