const mongoose = require('mongoose');

const userDataSchema = new mongoose.Schema({
  _id: String,
  usersnowflake: String,
  role: String,
  reports: [String],
  commands: Number
});

const UserData = mongoose.model('userdata', userDataSchema)

module.exports = UserData;