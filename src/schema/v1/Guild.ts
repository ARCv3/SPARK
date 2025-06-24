import mongoose from 'mongoose';
import mongooseLong from 'mongoose-long'

mongooseLong(mongoose);

const { Types: { Long, ObjectId} } = mongoose;

const guildSchema = new mongoose.Schema({
  _id: ObjectId,
  guildsnowflake: Long,
  premium: Boolean,
  moderators: [String],
  ownerid: Long
});


const Guild = mongoose.model("Guild", guildSchema, "Guilds");

export default Guild;