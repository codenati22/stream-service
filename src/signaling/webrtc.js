const WebSocket = require("ws");

const wss = new WebSocket.Server({ noServer: true });
const streams = new Map();

wss.on("connection", (ws, req) => {
  const streamId = req.url.split("/")[1];
  if (!streamId) {
    ws.close();
    return;
  }

  if (!streams.has(streamId)) {
    streams.set(streamId, { clients: new Set(), owner: ws });
  } else {
    streams.get(streamId).clients.add(ws);
  }

  ws.on("message", (message) => {
    const data = JSON.parse(message);
    const stream = streams.get(streamId);

    if (
      data.type === "offer" ||
      data.type === "answer" ||
      data.type === "candidate"
    ) {
      stream.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    }
  });

  ws.on("close", async () => {
    const stream = streams.get(streamId);
    if (stream.owner === ws) {
      streams.delete(streamId);
      await require("../models/Stream").findByIdAndUpdate(streamId, {
        status: "ended",
      });
    } else {
      stream.clients.delete(ws);
    }
  });
});

module.exports = { wss };
