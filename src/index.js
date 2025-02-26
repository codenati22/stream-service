const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const { wss } = require("./signaling/webrtc");
const Stream = require("./models/Stream");
const User = require("./models/User");
const authMiddleware = require("./middleware/auth");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

connectDB();

app.use(express.json());

app.post("/start-stream", authMiddleware, async (req, res) => {
  const { title } = req.body;
  try {
    const stream = new Stream({ title, owner: req.user.id });
    await stream.save();
    res.json({ streamId: stream._id.toString() });
  } catch (error) {
    console.error("Start stream error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/streams", async (req, res) => {
  try {
    const streams = await Stream.find({ status: "live" }).populate(
      "owner",
      "username"
    );
    res.json(streams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

server.on("upgrade", (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () =>
  console.log(`Stream service running on port ${PORT}`)
);
