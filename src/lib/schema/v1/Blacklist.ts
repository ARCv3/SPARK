import mongoose from 'mongoose';
import mongooseLong from 'mongoose-long'

mongooseLong(mongoose);

const { Types: { Long, ObjectId} } = mongoose;

const blacklistSchema = new mongoose.Schema({
    _id: ObjectId,
    usersnowflake: Long,
    cmd: String,
    guildsnowflake: Long
})

const Blacklist = mongoose.model("Blacklist", blacklistSchema);

export default Blacklist;