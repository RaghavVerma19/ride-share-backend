import { WebSocketServer, WebSocket } from "ws";
import { httpServer } from "../app.js"; // Assuming this is your HTTP server
import Redis from "ioredis";
import jwt from "jsonwebtoken";
import { User } from "../../models/user.model.js";
import { Message } from "../../models/message.model.js";
import cookie from "cookie";

const wsServer = new WebSocketServer({
  server: httpServer,
  path: "/game",
  verifyClient: async (info, done) => {
    try {
      const cookies = cookie.parse(info.req.headers.cookie || "");
      const token = cookies.accessToken;

      if (!token) {
        return done(false, 401, "Unauthorized: No token provided");
      }

      const decodedToken = jwt.verify(token, process.env.ACCESSTOKEN_SECRET);
      const user = await User.findById(decodedToken?._id).select(
        "-password -refreshToken"
      );

      if (!user) {
        return done(false, 401, "Unauthorized: User not found");
      }

      info.req.user = user;
      done(true);
    } catch (error) {
      return done(false, 401, "Unauthorized: Invalid token");
    }
  },
});

const redis = new Redis();

// This map now stores comprehensive data for each client
const clients = new Map(); // { userId -> { ws, userName, zoneId, x, y, anim } }
const zones = new Map(); // { zoneId -> Set<userId> }

wsServer.on("connection", (ws, req) => {
  const user = req.user;
  const userId = user._id.toString();
  const userName = user.userName;

  // Initialize client state
  const clientData = {
    ws,
    userName,
    zoneId: null, // Player starts in no zone
    x: 0,
    y: 0,
    anim: 'idle-down',
  };
  clients.set(userId, clientData);

  console.log(`User ${userName} (${userId}) connected`);

  ws.on("message", (data) => {
    handleMessage(ws, user, data);
  });

  ws.on("close", () => {
    const closingClient = clients.get(userId);
    if (closingClient && closingClient.zoneId) {
      // Notify the zone that the user has left
      broadcastToZone(closingClient.zoneId, {
        type: "userLeft",
        userId,
        userName,
      });
      // Remove user from the zone set
      const zone = zones.get(closingClient.zoneId);
      if (zone) {
        zone.delete(userId);
      }
    }
    clients.delete(userId);
    console.log(`User ${userName} (${userId}) disconnected`);
  });
});

function handleMessage(ws, user, rawData) {
  try {
    const msg = JSON.parse(rawData);
    const userId = user._id.toString();
    const userName = user.userName;
    const playerClient = clients.get(userId);

    if (!playerClient) return;

    switch (msg.type) {
      case "joinZone":
        const newZoneId = msg.zoneId;
        const oldZoneId = playerClient.zoneId;

        // --- THIS IS THE FIX ---
        // Update the player's position on the server as soon as they join a zone.
        playerClient.x = msg.x;
        playerClient.y = msg.y;
        playerClient.anim = 'idle-down'; // Set a default animation
        // --- END FIX ---

        // If the player was in a previous zone, remove them and notify others.
        if (oldZoneId && zones.has(oldZoneId)) {
          zones.get(oldZoneId).delete(userId);
          broadcastToZone(oldZoneId, { type: "userLeft", userId, userName });
        }

        // Add the player to the new zone.
        if (!zones.has(newZoneId)) zones.set(newZoneId, new Set());
        zones.get(newZoneId).add(userId);
        playerClient.zoneId = newZoneId;

        // Get a list of all other players who are already in this zone.
        const playersInZone = [];
        for (const id of zones.get(newZoneId)) {
          if (id === userId) continue; // Don't include the player themselves.
          const otherClient = clients.get(id);
          if (otherClient) {
            playersInZone.push({
              userId: id,
              userName: otherClient.userName,
              x: otherClient.x, // This will now have the correct value.
              y: otherClient.y, // This will now have the correct value.
              anim: otherClient.anim,
            });
          }
        }

        // Send the complete state of the zone (the list of other players) ONLY to the new player.
        ws.send(JSON.stringify({
          type: "zoneState",
          myId: userId,
          players: playersInZone
        }));

        // Notify everyone ELSE in the zone that a new player has arrived at their correct position.
        broadcastToZone(newZoneId, {
          type: "userJoined",
          userId,
          userName,
          x: playerClient.x,
          y: playerClient.y,
          anim: playerClient.anim
        }, userId); // Exclude the new player from this broadcast.
        break;

      case "playerMove":
        if (playerClient.zoneId) {
          // Update the player's state on the server.
          playerClient.x = msg.x;
          playerClient.y = msg.y;
          playerClient.anim = msg.anim;

          // Broadcast the move to everyone else in the same zone.
          broadcastToZone(playerClient.zoneId, {
            type: "playerMove",
            userId,
            x: msg.x,
            y: msg.y,
            anim: msg.anim,
          }, userId); // Exclude the sender.
        }
        break;

      // Your existing chat handlers remain the same.
      case "zone":
        if (playerClient.zoneId) {
            broadcastToZone(playerClient.zoneId, {
                type: "zone",
                senderId: userId,
                senderName: userName,
                text: msg.text,
                zone: playerClient.zoneId,
                ts: Date.now(),
            });
            // Your Redis logic can go here.
        }
        break;

      case "global":
        broadcastToAll({
          type: "global",
          senderId: userId,
          senderName: userName,
          text: msg.text,
          ts: Date.now(),
        });
        // Your Redis logic can go here.
        break;

      case "dm":
        sendDM(userId, userName, msg.recipientId, msg.text);
        // Your Redis logic can go here.
        break;
    }
  } catch (error) {
    console.error("Failed to parse message or handle event:", error);
    ws.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
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

// Updated to allow excluding a specific user
function broadcastToZone(zoneId, message, excludeUserId = null) {
  const data = JSON.stringify(message);
  const zone = zones.get(zoneId);
  if (!zone) return;

  for (const userId of zone) {
    if (userId === excludeUserId) continue; // Don't send the message back to the sender
    const client = clients.get(userId);
    if (client && client.ws && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  }
}

async function sendDM(fromUserId, fromUserName, toUserId, text) {
  const toClient = clients.get(toUserId);
  const fromClient = clients.get(fromUserId);

  const message = {
    type: "dm",
    senderId: fromUserId,
    senderName: fromUserName,
    recipientId: toUserId,
    recipientName: toClient ? toClient.userName : "Unknown User",
    text,
    ts: Date.now(),
  };

  const newMessage = new Message({
    type: "dm",
    senderId: fromUserId,
    recipientId: toUserId,
    text: text,
    ts: new Date(message.ts),
  });
  await newMessage.save();

  if (toClient && toClient.ws && toClient.ws.readyState === WebSocket.OPEN) {
    toClient.ws.send(JSON.stringify(message));
  }

  if (fromClient && fromClient.ws && fromClient.ws.readyState === WebSocket.OPEN) {
    fromClient.ws.send(JSON.stringify(message));
  }
}

export default wsServer;
