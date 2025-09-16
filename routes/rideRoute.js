import express from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import {
  createRide,
  getRides,
  getRideById,
  updateRide,
  deleteRide,
  addPassenger,
  searchRides,
} from "../controllers/rideController.js";

const rideRouter = express.Router();

// If you want all ride routes protected, keep this middleware:
rideRouter.use(verifyJwt);

// Important: place static/specific routes before dynamic params
rideRouter.get("/search", searchRides);

// List & create
rideRouter.route("/").post(createRide).get(getRides);

// Ride by id + passengers
rideRouter
  .route("/:rideId")
  .get(getRideById)
  .put(updateRide)
  .delete(deleteRide);

rideRouter.route("/:rideId/passengers").post(addPassenger);

export default rideRouter;
