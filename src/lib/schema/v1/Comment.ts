import mongoose from 'mongoose';

const CommentSchema = new mongoose.Schema({
  userSnowflake: String,
  appealId: String,
  commentContents: String,
  commentDate: String
})

const Comment = mongoose.model('Comment', CommentSchema);

export default Comment;