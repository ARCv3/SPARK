import mongoose from 'mongoose';

const ApprovalSchema = new mongoose.Schema({
  guildSnowflake: String,
  userSnowflake: String,
  authorSnowflake: String,
  date: String
})

const Approval = mongoose.model('Approval', ApprovalSchema);

export default Approval;