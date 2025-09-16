import mongoose from "mongoose";
const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Point"],
    required: true,
  },
  coordinates: {
    type: [Number],
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
});

const rideSchema = new mongoose.Schema(
  {
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    passengers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        status: {
          type: String,
          enum: ["pending", "confirmed", "cancelled"],
          default: "pending",
        },
      },
    ],

    startPoint: {
      type: pointSchema,
      required: true,
    },
    endPoint: {
      type: pointSchema,
      required: true,
    },
    departureTime: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "in-progress", "completed", "cancelled"],
      default: "scheduled",
    },
    fare: {
      type: Number,
      required: true,
    },
    seatCapacity: {
      type: Number,
      required: true,
      min: 1,
    },
    vehicle: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

rideSchema.index({ startPoint: "2dsphere" });
rideSchema.index({ endPoint: "2dsphere" });

export const Ride = mongoose.model("Ride", rideSchema);
