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
    console.log(`New stream ${streamId} started by owner`);
  } else {
    streams.get(streamId).clients.add(ws);
    console.log(`Viewer joined stream ${streamId}`);
  }

  ws.on("message", (message) => {
    const data = JSON.parse(message);
    const stream = streams.get(streamId);
    if (!stream) return;

    console.log(`Relaying message for ${streamId}:`, data);
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
      if (
        data.type === "answer" &&
        stream.owner !== ws &&
        stream.owner.readyState === WebSocket.OPEN
      ) {
        stream.owner.send(JSON.stringify(data));
      }
    }
  });

  ws.on("close", () => {
    const stream = streams.get(streamId);
    if (!stream) return;
    if (stream.owner === ws) {
      stream.clients.forEach((client) => client.close());
      streams.delete(streamId);
      console.log(`Stream ${streamId} ended by owner`);
    } else {
      stream.clients.delete(ws);
      console.log(`Viewer left stream ${streamId}`);
      if (
        stream.clients.size === 0 &&
        stream.owner.readyState !== WebSocket.OPEN
      ) {
        streams.delete(streamId);
      }
    }
  });
});

module.exports = { wss };
