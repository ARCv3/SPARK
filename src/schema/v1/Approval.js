const mongoose = require('mongoose');

const ApprovalSchema = new mongoose.Schema({
  guildSnowflake: String,
  userSnowflake: String,
  authorSnowflake: String,
  date: String
})

const Approval = mongoose.model('Approval', ApprovalSchema);

module.exports = Approval;