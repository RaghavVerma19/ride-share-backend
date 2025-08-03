import { User } from "../models/user.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh tokens."
    );
  }
};

const registerUser = async (req, res, next) => {
  const { userName, email, fullName, password, userType } = req.body;
  if (
    [userName, email, fullName, password, userType].some((field) => {
      field?.trim() === "";
    })
  ) {
    throw new ApiError(400, "Field is required.");
  }
  const existingUser = await User.findOne({
    $or: [{ userName }, { email }],
  });
  if (existingUser) {
    throw new ApiError(409, "User already exists");
  }
  const user = await User.create({
    userName,
    email,
    password,
    fullName,
    type: userType,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while creating the user.");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully."));
};
const loginUser = async (req, res, next) => {
  let email;
  const { userName, password } = req.body;
  if (!userName) {
    throw new ApiError(400, "Field required.");
  }
  if (userName.includes("@gmail.com")) {
    email = userName;
    userName = null;
  }
  if (!password) {
    throw new ApiError(400, "Password required.");
  }
  const user = await User.findOne({ $or: [{ userName }, { email }] });
  if (!user) {
    throw new ApiError(400, "No User Found.");
  }
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid Password");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 7, // e.g. 7 days 
    path: "/",
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in successfully."
      )
    );
};
const logOutUser = asyncHandler(async function (req, res) {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },
    {
      new: true,
    }
  );
  const options = {
    // httpOnly: true,
    // secure: true,
    path: "/",
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully."));
});
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Old password not correct.");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully."));
});
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200,{user:req.user},"Current User fetched successfully."));
});
const updateCurrentUser = asyncHandler(async (req, res) => {
  const { fullName, bio, avatarUrl } = req.body;
  const user = await User.findById(req.user?._id);
  user.fullName = fullName;
  user.bio = bio;
  user.avatarUrl = avatarUrl;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "User updated successfully."));
});
const getAllUsers = async (req, res) => {
  const users = await User.find({ _id: { $ne: req.user._id } }).select("-password -refreshToken");
  return res
    .status(200)
    .json(new ApiResponse(200, users, "Users fetched successfully."));
};
export {
  registerUser,
  loginUser,
  logOutUser,
  changeCurrentPassword,
  getCurrentUser,
  updateCurrentUser,
  getAllUsers,
};
