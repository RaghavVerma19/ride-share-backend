import mongoose from "mongoose";
import { User } from "./user.model.js";
const messageSchema = mongoose.Schema({
  room: {
    type: String,
    enum: ["global", "zone", "dm"],
    required: true,
    index: true,
  },
  senderId: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
    maxlength: 200,
  },
  ts: {
    type: Date,
    required: true,
    default: Date.now,
    index: true,
  },
});

export const Message = mongoose.model("Message", messageSchema);
