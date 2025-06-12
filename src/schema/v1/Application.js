const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
  guildSnowflake: String,
  userSnowflake: String,
  submitDate: String,
  experience: String,
  position: String, 
  server: String,
  botexp: String,
  avail: String,
  message: String,
  about: String,
  age: String,
  joindate: String
})

const Application = mongoose.model('Application', ApplicationSchema);

module.exports = Application;