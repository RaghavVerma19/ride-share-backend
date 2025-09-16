import mongoose from "mongoose";
import { Ride } from "../models/rides.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

/* -----------------------
   Helpers
   ----------------------- */

const makePointObject = (maybePoint, coordsFromBody) => {
  // Accept either:
  // - an object already like { type: 'Point', coordinates: [lng, lat], address }
  // - an address string (maybePoint) + coordsFromBody as [lng, lat] OR { lat, lng }
  if (!maybePoint && !coordsFromBody) return null;

  // if already a proper point object, validate shape
  if (
    typeof maybePoint === "object" &&
    maybePoint.type === "Point" &&
    Array.isArray(maybePoint.coordinates) &&
    maybePoint.coordinates.length === 2 &&
    maybePoint.address
  ) {
    return {
      type: "Point",
      coordinates: [Number(maybePoint.coordinates[0]), Number(maybePoint.coordinates[1])],
      address: String(maybePoint.address),
    };
  }

  // if maybePoint is an object with address and geometry shape from frontend (Google Place)
  if (typeof maybePoint === "object" && maybePoint.address && maybePoint.coordinates) {
    return {
      type: "Point",
      coordinates: [Number(maybePoint.coordinates[0]), Number(maybePoint.coordinates[1])],
      address: String(maybePoint.address),
    };
  }

  // if maybePoint is a string address, use coordsFromBody
  if (typeof maybePoint === "string" && coordsFromBody) {
    // coordsFromBody may be array [lng, lat] or object { lat, lng }
    if (Array.isArray(coordsFromBody) && coordsFromBody.length === 2) {
      return {
        type: "Point",
        coordinates: [Number(coordsFromBody[0]), Number(coordsFromBody[1])],
        address: String(maybePoint),
      };
    }
    if (
      typeof coordsFromBody === "object" &&
      coordsFromBody.lng !== undefined &&
      coordsFromBody.lat !== undefined
    ) {
      return {
        type: "Point",
        coordinates: [Number(coordsFromBody.lng), Number(coordsFromBody.lat)],
        address: String(maybePoint),
      };
    }
  }

  return null;
};

/* -----------------------
   Controllers
   ----------------------- */

// Create a ride
const createRide = asyncHandler(async (req, res) => {
  const {
    startPoint, // may be object or string address
    endPoint, // may be object or string address
    startPointCoords, // optional: [lng, lat] OR { lat, lng }
    endPointCoords,
    departureTime,
    fare,
    seatCapacity,
    vehicle,
  } = req.body;

  // Build point objects from provided data
  const startPointObj = makePointObject(startPoint, startPointCoords);
  const endPointObj = makePointObject(endPoint, endPointCoords);

  // If either is null, return helpful error so frontend can fix payload
  if (!startPointObj) {
    throw new ApiError(
      400,
      "startPoint is missing or incomplete. Provide startPoint as an object { type:'Point', coordinates:[lng,lat], address } or provide startPoint (address string) + startPointCoords ([lng,lat] or {lat,lng})."
    );
  }
  if (!endPointObj) {
    throw new ApiError(
      400,
      "endPoint is missing or incomplete. Provide endPoint as an object { type:'Point', coordinates:[lng,lat], address } or provide endPoint (address string) + endPointCoords ([lng,lat] or {lat,lng})."
    );
  }

  const driver = req.user && req.user._id;

  const ride = await Ride.create({
    driver,
    startPoint: startPointObj,
    endPoint: endPointObj,
    departureTime: departureTime ? new Date(departureTime) : undefined,
    fare,
    seatCapacity,
    vehicle,
  });

  if (!ride) {
    throw new ApiError(500, "Something went wrong while creating the ride");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, ride, "Ride created successfully"));
});

// Get all rides
const getRides = asyncHandler(async (req, res) => {
  const rides = await Ride.find().populate("driver", "fullName");
  return res
    .status(200)
    .json(new ApiResponse(200, rides, "Rides retrieved successfully"));
});

// Get ride by id
const getRideById = asyncHandler(async (req, res) => {
  const { rideId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(rideId)) {
    throw new ApiError(400, "Invalid ride id");
  }

  const ride = await Ride.findById(rideId).populate("driver", "fullName");

  if (!ride) {
    throw new ApiError(404, "Ride not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, ride, "Ride retrieved successfully"));
});

// Update ride
const updateRide = asyncHandler(async (req, res) => {
  const { rideId } = req.params;
  const {
    startPoint,
    endPoint,
    startPointCoords,
    endPointCoords,
    departureTime,
    fare,
    seatCapacity,
    vehicle,
  } = req.body;

  if (!mongoose.Types.ObjectId.isValid(rideId)) {
    throw new ApiError(400, "Invalid ride id");
  }

  const ride = await Ride.findById(rideId);
  if (!ride) {
    throw new ApiError(404, "Ride not found");
  }

  if (ride.driver.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this ride");
  }

  const startPointObj = startPoint ? makePointObject(startPoint, startPointCoords) : ride.startPoint;
  const endPointObj = endPoint ? makePointObject(endPoint, endPointCoords) : ride.endPoint;

  // If caller provided startPoint but didn't provide coords, reject
  if (startPoint && !startPointObj) {
    throw new ApiError(
      400,
      "Invalid startPoint provided. Provide full point or coordinates along with address."
    );
  }
  if (endPoint && !endPointObj) {
    throw new ApiError(
      400,
      "Invalid endPoint provided. Provide full point or coordinates along with address."
    );
  }

  const updatedRide = await Ride.findByIdAndUpdate(
    rideId,
    {
      $set: {
        startPoint: startPointObj,
        endPoint: endPointObj,
        departureTime: departureTime ? new Date(departureTime) : ride.departureTime,
        fare: fare ?? ride.fare,
        seatCapacity: seatCapacity ?? ride.seatCapacity,
        vehicle: vehicle ?? ride.vehicle,
      },
    },
    { new: true }
  ).populate("driver", "fullName");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedRide, "Ride updated successfully"));
});

// Delete ride
const deleteRide = asyncHandler(async (req, res) => {
  const { rideId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(rideId)) {
    throw new ApiError(400, "Invalid ride id");
  }

  const ride = await Ride.findById(rideId);

  if (!ride) {
    throw new ApiError(404, "Ride not found");
  }

  if (ride.driver.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this ride");
  }

  await Ride.findByIdAndDelete(rideId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Ride deleted successfully"));
});

// Add passenger
const addPassenger = asyncHandler(async (req, res) => {
  const { rideId } = req.params;
  const passengerId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(rideId)) {
    throw new ApiError(400, "Invalid ride id");
  }

  const ride = await Ride.findById(rideId);

  if (!ride) {
    throw new ApiError(404, "Ride not found");
  }

  const occupied = Array.isArray(ride.passengers) ? ride.passengers.length : 0;
  if (ride.seatCapacity - occupied <= 0) {
    throw new ApiError(400, "Ride is full");
  }

  const isPassenger = ride.passengers.find(
    (p) => p.user.toString() === passengerId.toString()
  );
  if (isPassenger) {
    throw new ApiError(400, "You are already a passenger in this ride");
  }

  ride.passengers.push({ user: passengerId });
  await ride.save();

  return res
    .status(200)
    .json(new ApiResponse(200, ride, "Passenger added successfully"));
});

// inside controllers/rideController.js (replace previous searchRides)
const searchRides = asyncHandler(async (req, res) => {
  const {
    startPoint,
    endPoint,
    departureTime,
    seats,
    startLng,
    startLat,
    endLng,
    endLat,
    radius = 5000, // default radius 5km
    page = 1,
    limit = 10
  } = req.query;

  const query = {};
  const andClauses = [];

  // If start coords provided -> use $near geo-query on startPoint.coordinates
  const hasStartCoords = startLng !== undefined && startLat !== undefined;
  const hasEndCoords = endLng !== undefined && endLat !== undefined;

  if (hasStartCoords) {
    const lng = Number(startLng);
    const lat = Number(startLat);
    const maxDistance = Number(radius) || 5000;

    // $near on the subdocument coordinates field
    query['startPoint.coordinates'] = {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: maxDistance
      }
    };
  } else if (startPoint) {
    andClauses.push({
      "startPoint.address": { $regex: startPoint, $options: "i" }
    });
  }

  // If end coords provided -> also require endPoint near that point (optional)
  if (hasEndCoords) {
    const lng = Number(endLng);
    const lat = Number(endLat);
    const maxDistance = Number(radius) || 5000;

    // Add an $and clause to combine with startPoint near
    andClauses.push({
      "endPoint.coordinates": {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: maxDistance
        }
      }
    });
  } else if (endPoint) {
    andClauses.push({
      "endPoint.address": { $regex: endPoint, $options: "i" }
    });
  }

  // departureTime: search within that day if provided, otherwise future rides
  if (departureTime) {
    const dt = new Date(departureTime);
    if (!isNaN(dt.getTime())) {
      const startOfDay = new Date(dt);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dt);
      endOfDay.setHours(23, 59, 59, 999);
      query.departureTime = { $gte: startOfDay, $lte: endOfDay };
    }
  } else {
    query.departureTime = { $gte: new Date() };
  }

  if (andClauses.length) query.$and = andClauses;

  const seatsNum = parseInt(seats, 10) || 1;

  // ensure available seats >= requested seats
  query.$expr = {
    $gte: [
      { $subtract: ["$seatCapacity", { $size: { $ifNull: ["$passengers", []] } }] },
      seatsNum,
    ]
  };

  // debug log (can remove later)
  console.log('searchRides -> query:', JSON.stringify(query));
  console.log('searchRides -> options:', { page: Number(page), limit: Number(limit), radius });

  // pagination
  const p = Math.max(1, Number(page) || 1);
  const lim = Math.max(1, Math.min(100, Number(limit) || 10)); // max 100
  const skip = (p - 1) * lim;

  // count total matching
  const total = await Ride.countDocuments(query);

  const rides = await Ride.find(query)
    .populate("driver", "fullName")
    .sort({ departureTime: 1 })
    .skip(skip)
    .limit(lim);

  return res
    .status(200)
    .json(new ApiResponse(200, { rides, total, page: p, limit: lim }, "Rides retrieved successfully"));
});



export {
  createRide,
  getRides,
  getRideById,
  updateRide,
  deleteRide,
  addPassenger,
  searchRides,
};
