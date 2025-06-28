import express from "express";
import handleGoogleLogin from "../controllers/googleuthController.js";
import asyncHandler from "../utils/asyncHandler.js";

const googleAuthRouter = express.Router();
googleAuthRouter.post("/api/auth/google",asyncHandler(handleGoogleLogin))

export default googleAuthRouter;
