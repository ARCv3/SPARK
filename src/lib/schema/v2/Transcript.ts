import mongoose from 'mongoose';

const TranscriptSchema = new mongoose.Schema({

  modmailId: String,
  sendersnowflake: String,
  attachments: [String],
  createdat: Date,
  GuildSnowflake: String,
  messagecontent: String,
  transcripttype: String,
  comment: Boolean,
  messageid: String
}, {
  collection: "transcripts"
});

const Transcript = mongoose.model('Transcript', TranscriptSchema);

export default Transcript;