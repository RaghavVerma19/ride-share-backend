import Redis from "ioredis";
import asyncHandler from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { Message } from "../models/message.model.js";

const redis = new Redis();

const getChatHistory = async (req, res) => {
  const { type, id } = req.params;
  const { cursor = "-", count = 20 } = req.query;

  let streamKey;
  if (type === "zone") {
    streamKey = `chat:zone:${id}`;
  } else if (type === "dm") {
    const otherUserId = id;
    const currentUserId = req.user._id.toString();
    streamKey = `dm:${[currentUserId, otherUserId].sort().join("-")}`;
  } else if (type === "global") {
    streamKey = "chat:global";
  } else {
    throw new ApiError(400, "Invalid chat type specified");
  }

  let messages = [];
  let nextCursor = null;

  if (type === "dm") {
    const otherUserId = id;
    const currentUserId = req.user._id.toString();
    const dmRoomId = [currentUserId, otherUserId].sort().join("-");

    const dmMessages = await Message.find({
      $or: [
        { senderId: currentUserId, recipientId: otherUserId },
        { senderId: otherUserId, recipientId: currentUserId },
      ],
    })
      .sort({ ts: -1 })
      .limit(count)
      .skip(cursor === "-" ? 0 : parseInt(cursor))
      .lean();

    const userIds = new Set();
    dmMessages.forEach((msg) => {
      userIds.add(msg.senderId);
      userIds.add(msg.recipientId);
    });

    const users = await User.find({ _id: { $in: Array.from(userIds) } }).select(
      "userName"
    );
    const userMap = new Map(
      users.map((user) => [user._id.toString(), user.userName])
    );

    messages = dmMessages.map((msg) => ({
      ...msg,
      senderName: userMap.get(msg.senderId),
      recipientName: userMap.get(msg.recipientId),
    }));
    nextCursor =
      messages.length > 0 ? parseInt(cursor) + messages.length : null;
  } else {
    const results = await redis.xrevrange(
      streamKey,
      cursor === "-" ? "+" : `(${cursor}`,
      "-",
      "COUNT",
      count
    );

    if (!results || results.length === 0) {
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { messages: [], nextCursor: null },
            "No messages found."
          )
        );
    }

    const userIdsToFetch = new Set();

    for (const result of results) {
      const [id, fields] = result;
      const message = { id };
      let hasSenderName = false;

      for (let i = 0; i < fields.length; i += 2) {
        message[fields[i]] = fields[i + 1];
        if (fields[i] === "senderName") {
          hasSenderName = true;
        }
      }

      if (!hasSenderName && message.senderId) {
        userIdsToFetch.add(message.senderId);
      }
      messages.push(message);
    }

    if (userIdsToFetch.size > 0) {
      const users = await User.find({
        _id: { $in: Array.from(userIdsToFetch) },
      }).select("userName");
      const userMap = new Map(
        users.map((user) => [user._id.toString(), user.userName])
      );

      for (const message of messages) {
        if (
          !message.senderName &&
          message.senderId &&
          userMap.has(message.senderId)
        ) {
          message.senderName = userMap.get(message.senderId);
        }
      }
    }

    nextCursor = messages.length > 0 ? messages[messages.length - 1].id : null;
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { messages, nextCursor },
        "Chat history fetched successfully."
      )
    );
};

export { getChatHistory };
