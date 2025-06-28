import { WebSocketServer, WebSocket } from "ws";
import { httpServer } from "../app.js";
import Redis from "ioredis";
import jwt from "jsonwebtoken";
import { User } from "../../models/user.model.js";
import cookie from "cookie";

const ws = new WebSocketServer({
  server: httpServer,
  path: "/game",
  verifyClient: async (info, done) => {
    try {
      const cookies = cookie.parse(info.req.headers.cookie || "");
      const token = cookies.accessToken;

      if (!token) {
        return done(false, 401, "Unauthorized");
      }

      const decodedToken = jwt.verify(token, process.env.ACCESSTOKEN_SECRET);
      const user = await User.findById(decodedToken?._id).select(
        "-password -refreshToken"
      );

      if (!user) {
        return done(false, 401, "Unauthorized");
      }

      info.req.user = user;
      done(true);
    } catch (error) {
      return done(false, 401, "Unauthorized");
    }
  },
});
const redis = new Redis();

const clients = new Map();
const zones = new Map();

ws.on("connection", (ws, req) => {
  const user = req.user;
  const userId = user._id.toString();
  const userName = user.userName;

  clients.set(userId, { ws, userName });

  console.log(`User ${userName} (${userId}) connected`);

  ws.on("message", (data) => {
    handleMessage(ws, user, data);
  });

  ws.on("close", () => {
    clients.delete(userId);
    for (const [zoneId, zone] of zones.entries()) {
      if (zone.has(userId)) {
        zone.delete(userId);
        broadcastToZone(zoneId, {
          type: "userLeft",
          userId,
          userName,
          zoneId,
          ts: Date.now(),
        });
      }
    }
    console.log(`User ${userName} (${userId}) disconnected`);
  });
});

function handleMessage(ws, user, rawData) {
  try {
    const msg = JSON.parse(rawData);
    const userId = user._id.toString();
    const userName = user.userName;

    switch (msg.type) {
      case "joinZone":
        if (!zones.has(msg.zoneId)) zones.set(msg.zoneId, new Set());
        zones.get(msg.zoneId).add(userId);
        broadcastToZone(msg.zoneId, {
          type: "userJoined",
          userId,
          userName,
          zoneId: msg.zoneId,
          ts: Date.now(),
        });
        break;

      case "zoneChat":
        broadcastToZone(msg.zoneId, {
          type: "zoneChat",
          senderId: userId,
          senderName: userName,
          text: msg.text,
          ts: Date.now(),
        });
        redis.xadd(
          `chat:zone:${msg.zoneId}`,
          "*",
          "senderId",
          userId,
          "senderName",
          userName,
          "text",
          msg.text,
          "ts",
          Date.now().toString()
        );
        break;

      case "globalChat":
        broadcastToAll({
          type: "globalChat",
          senderId: userId,
          senderName: userName,
          text: msg.text,
          ts: Date.now(),
        });
        redis.xadd(
          "chat:global",
          "*",
          "senderId",
          userId,
          "senderName",
          userName,
          "text",
          msg.text,
          "ts",
          Date.now().toString()
        );
        break;

      case "dm":
        sendDM(userId, userName, msg.toUserId, msg.text);
        break;
    }
  } catch (error) {
    console.error("Failed to parse message or handle event:", error);
    ws.send(
      JSON.stringify({ type: "error", message: "Invalid message format" })
    );
  }
}

function broadcastToAll(message) {
  const data = JSON.stringify(message);
  for (const client of clients.values()) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  }
}

function broadcastToZone(zoneId, message) {
  const data = JSON.stringify(message);
  const zone = zones.get(zoneId);
  if (!zone) return;

  for (const userId of zone) {
    const client = clients.get(userId);
    if (client && client.ws && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  }
}

function sendDM(fromUserId, fromUserName, toUserId, text) {
  const toClient = clients.get(toUserId);
  if (!toClient || !toClient.ws) return;

  const message = {
    type: "dm",
    senderId: fromUserId,
    senderName: fromUserName,
    text,
    ts: Date.now(),
  };
  toClient.ws.send(JSON.stringify(message));

  const streamKey = `dm:${[fromUserId, toUserId].sort().join("-")}`;
  redis.xadd(
    streamKey,
    "*",
    "senderId",
    fromUserId,
    "senderName",
    fromUserName,
    "text",
    text,
    "ts",
    Date.now().toString()
  );
}

export default ws;
