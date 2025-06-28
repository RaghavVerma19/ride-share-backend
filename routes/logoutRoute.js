import express from "express";
import asyncHandler from "../utils/asyncHandler.js";
import {verifyJwt} from "../middlewares/auth.middleware.js";
import { logOutUser } from "../controllers/userController.js";

const logoutRouter = express.Router();
logoutRouter.post("/api/logout",verifyJwt,asyncHandler(logOutUser))

export default logoutRouter;