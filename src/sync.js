import Redis from "ioredis";
import mongoose from "mongoose";
import { Message } from "../models/message.model.js";
import { DBName } from "./constants.js";
import connectDB from "../db/connect.js";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const redis = new Redis();
connectDB();

async function syncLoop() {
  const entries = await redis.xreadgroup(
    "GROUP",
    "mongo-sync",
    "worker1",
    "COUNT",
    100,
    "BLOCK",
    5000,
    "STREAMS",
    "chat:global",
    ">"
  );

  if (!entries) return;
  const [messages] = entries[0];

  const docs = messages.map(([id, fields]) => {
    const obj = { room: "global" };
    for (let i = 0; i < fields.length; i += 2) {
      obj[fields[i]] = fields[i + 1];
    }
    obj.ts = new Date(parseInt(obj.ts));
    return obj;
  });

  await Message.insertMany(docs);

  // acknowledge so Redis can purge if you trim
  const ids = messages.map(([id]) => id);
  await redis.xack("chat:global", "mongo-sync", ...ids);
}

setInterval(syncLoop, 2000);
