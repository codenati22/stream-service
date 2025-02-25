const mongoose = require("mongoose");

const streamSchema = new mongoose.Schema({
  title: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["live", "ended"], default: "live" },
  createdAt: { type: Date, default: Date.now },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

module.exports = mongoose.model("Stream", streamSchema);
