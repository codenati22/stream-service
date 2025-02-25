const express = require("express");
const http = require("http");
const { wss } = require("./signaling/webrtc");

const app = express();
const server = http.createServer(app);

server.on("upgrade", (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});

app.get("/start-stream", (req, res) => {
  const streamId = Date.now().toString();
  res.json({ streamId });
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () =>
  console.log(`Stream service running on port ${PORT}`)
);
