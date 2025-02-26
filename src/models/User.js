const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  streams: [{ type: mongoose.Schema.Types.ObjectId, ref: "Stream" }],
});

module.exports = mongoose.model("User", userSchema);
