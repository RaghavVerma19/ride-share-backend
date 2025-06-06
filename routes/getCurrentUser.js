import express from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import asyncHandler from "../utils/asyncHandler.js";
import { getCurrentUser } from "../controllers/userController.js";

const currentUserRouter = express.Router();

currentUserRouter.get("/api/me",verifyJwt,asyncHandler(getCurrentUser));

export default currentUserRouter;