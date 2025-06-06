import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJwt = asyncHandler(async (req, res, next) => {
  try {
    const token =
      (await req.cookies?.accessToken) ||
      ((await req.header("Authorization"))
        ? req.header("Authorization").replace("Bearer ", "")
        : "");
    if (!token || typeof token !== "string") {
      throw new ApiError(401, "Unauthorized request.");
    }
    const decodedToken = jwt.verify(token, process.env.ACCESSTOKEN_SECRET);
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );
    if (!user) {
      throw new ApiError(401, "Invalid Access token.");
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message || "Authentication failed",
    });
  }
});
