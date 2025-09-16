import express from "express";
import { refreshAccessToken } from "../controllers/userController.js";
import asyncHandler from "../utils/asyncHandler.js";

const refreshTokenRouter = express.Router();

refreshTokenRouter.post("/api/auth/refresh-token", asyncHandler(refreshAccessToken));

export default refreshTokenRouter;
