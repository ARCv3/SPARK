import mongoose from 'mongoose';

const insightSchema = new mongoose.Schema({
  _id: String,
  type: String,
  date: String,
  tagline: String,
  guild_id: String,
  data: Object,
  url: String
}, {
  collection: "Insights"
})

const Insight = mongoose.model("Insight", insightSchema);

export default Insight;