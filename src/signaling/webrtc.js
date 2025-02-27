const WebSocket = require("ws");

const wss = new WebSocket.Server({ noServer: true });
const streams = new Map();

wss.on("connection", (ws, req) => {
  const [path, query] = req.url.split("?");
  const streamId = path.split("/")[1];
  const params = new URLSearchParams(query);
  const role = params.get("role");

  if (!streamId) {
    console.log("No streamId, closing connection");
    return ws.close();
  }

  console.log(`Connection to ${streamId} with role: ${role}`);

  if (!streams.has(streamId)) {
    if (role === "streamer") {
      streams.set(streamId, { owner: ws, viewers: new Set() });
      console.log(`Streamer connected to ${streamId}`);
    } else {
      console.log(
        `No stream exists for ${streamId}, closing viewer connection`
      );
      ws.close();
      return;
    }
  } else if (role === "viewer") {
    streams.get(streamId).viewers.add(ws);
    console.log(
      `Viewer connected to ${streamId}, total viewers: ${
        streams.get(streamId).viewers.size
      }`
    );
  } else {
    console.log(`Streamer already exists for ${streamId}, closing duplicate`);
    ws.close();
    return;
  }

  ws.on("message", (message) => {
    const data = JSON.parse(message);
    const stream = streams.get(streamId);
    if (!stream) return;

    console.log(`Received message for ${streamId}:`, data);

    if (data.type === "offer" && ws === stream.owner) {
      stream.viewers.forEach((viewer) => {
        if (viewer.readyState === WebSocket.OPEN) {
          console.log(`Relaying offer to viewer in ${streamId}`);
          viewer.send(JSON.stringify(data));
        }
      });
    } else if (
      data.type === "answer" &&
      stream.owner.readyState === WebSocket.OPEN
    ) {
      console.log(`Relaying answer to streamer in ${streamId}`);
      stream.owner.send(JSON.stringify(data));
    } else if (data.type === "candidate") {
      if (ws === stream.owner) {
        stream.viewers.forEach((viewer) => {
          if (viewer.readyState === WebSocket.OPEN) {
            console.log(`Relaying candidate to viewer in ${streamId}`);
            viewer.send(JSON.stringify(data));
          }
        });
      } else if (stream.owner.readyState === WebSocket.OPEN) {
        console.log(`Relaying candidate to streamer in ${streamId}`);
        stream.owner.send(JSON.stringify(data));
      }
    }
  });

  ws.on("close", () => {
    const stream = streams.get(streamId);
    if (!stream) return;
    if (ws === stream.owner) {
      stream.viewers.forEach((viewer) => viewer.close());
      streams.delete(streamId);
      console.log(`Streamer disconnected, ending ${streamId}`);
    } else {
      stream.viewers.delete(ws);
      console.log(
        `Viewer disconnected from ${streamId}, remaining: ${stream.viewers.size}`
      );
    }
  });
});

module.exports = { wss };
