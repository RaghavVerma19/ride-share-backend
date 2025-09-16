import mongoose from "mongoose";
import { User } from "./user.model.js";
const messageSchema = mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
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
