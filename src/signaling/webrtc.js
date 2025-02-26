const WebSocket = require("ws");

const wss = new WebSocket.Server({ noServer: true });
const streams = new Map();

wss.on("connection", (ws, req) => {
  const streamId = req.url.split("/")[1];
  if (!streamId) {
    ws.close();
    console.log("Closed connection: No streamId provided");
    return;
  }

  if (!streams.has(streamId)) {
    streams.set(streamId, { clients: new Set(), owner: ws, messages: [] });
    console.log(`New stream ${streamId} started by owner`);
  } else {
    const stream = streams.get(streamId);
    stream.clients.add(ws);
    console.log(
      `Viewer joined stream ${streamId}, total clients: ${stream.clients.size}`
    );
    // Send buffered messages to new viewer
    stream.messages.forEach((msg) => {
      if (ws.readyState === WebSocket.OPEN) {
        console.log(
          `Sending buffered message to new viewer in ${streamId}:`,
          msg
        );
        ws.send(JSON.stringify(msg));
      }
    });
  }

  ws.on("message", (message) => {
    const data = JSON.parse(message);
    const stream = streams.get(streamId);
    if (!stream) {
      console.log(`No stream found for ${streamId}`);
      return;
    }

    console.log(`Received message for ${streamId}:`, data);
    if (
      data.type === "offer" ||
      data.type === "answer" ||
      data.type === "candidate"
    ) {
      stream.messages.push(data); // Buffer message
      console.log(
        `Buffering message for ${streamId}, total messages: ${stream.messages.length}`
      );
      stream.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          console.log(`Relaying message to client in ${streamId}:`, data);
          client.send(JSON.stringify(data));
        }
      });
      if (
        data.type === "answer" &&
        stream.owner !== ws &&
        stream.owner.readyState === WebSocket.OPEN
      ) {
        console.log(`Relaying answer to owner in ${streamId}:`, data);
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
      console.log(
        `Viewer left stream ${streamId}, remaining clients: ${stream.clients.size}`
      );
      if (
        stream.clients.size === 0 &&
        stream.owner.readyState !== WebSocket.OPEN
      ) {
        streams.delete(streamId);
        console.log(`Stream ${streamId} closed: no clients or owner`);
      }
    }
  });
});

module.exports = { wss };
