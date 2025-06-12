const mongoose = require('mongoose');
require('mongoose-long')(mongoose);

const { Types: { Long, ObjectId} } = mongoose;

const guildSchema = new mongoose.Schema({
  _id: ObjectId,
  guildsnowflake: Long,
  premium: Boolean,
  moderators: [String],
  ownerid: Long
});


const Guild = mongoose.model("Guild", guildSchema, "Guilds");

module.exports = Guild;