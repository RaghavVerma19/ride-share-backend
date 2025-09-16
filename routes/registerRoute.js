import express from "express";
import { registerUser } from "../controllers/userController.js";
import asyncHandler from "../utils/asyncHandler.js";
const registerRouter = express.Router();

registerRouter.post("/api/auth/register", 
  asyncHandler(registerUser)
);

export default registerRouter;
