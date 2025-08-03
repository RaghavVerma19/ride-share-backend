import mongoose from "mongoose";
import { User } from "./user.model.js";
const messageSchema = mongoose.Schema({
  type: {
    type: String,
    enum: ["global", "zone", "dm"],
    required: true,
    index: true,
  },
  senderId: {
    type: String,
    required: true,
  },
  recipientId: {
    type: String,
    required: function () {
      return this.room === "dm";
    }, // Required only for DM messages
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
