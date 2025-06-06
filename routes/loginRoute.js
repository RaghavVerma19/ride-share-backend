import express from "express";
import { loginUser } from "../controllers/userController.js";
import asyncHandler from "../utils/asyncHandler.js";
const loginRouter = express.Router();

loginRouter.post("/api/login", 
  asyncHandler(loginUser)
);

export default loginRouter;
