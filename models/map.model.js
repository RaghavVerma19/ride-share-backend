import mongoose from "mongoose";

const mapSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    description: {
      type: String,
      index: true,
      trim: true,
    },
    thumbnail: {
      type: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Map = mongoose.model("Map", mapSchema);
