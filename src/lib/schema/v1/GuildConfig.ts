import mongoose from 'mongoose';
import mongooseLong from 'mongoose-long'

mongooseLong(mongoose);

const { Types: { Long, ObjectId} } = mongoose;

const guildConfigSchema = new mongoose.Schema({
    _id: ObjectId,
    guildsnowflake: Long,
    configkey: String,
    configvalue: String
});

const GuildConfig = mongoose.model("GuildConfig", guildConfigSchema);

export default GuildConfig;

