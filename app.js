const express = require("express");
const serverless = require("serverless-http");
const { wss } = require("./src/signaling/webrtc");

const app = express();

app.get("/start-stream", (req, res) => {
  const streamId = Date.now().toString();
  res.json({ streamId });
});

module.exports.handler = serverless(app);
module.exports.wss = wss;
