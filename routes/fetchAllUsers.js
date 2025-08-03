import { getAllUsers } from "../controllers/userController.js";
import express from "express";
import asyncHandler from "../utils/asyncHandler.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";  
const AllUsersRouter = express.Router();
AllUsersRouter.get("/api/v1/users", verifyJwt, asyncHandler(getAllUsers));
export default AllUsersRouter;
