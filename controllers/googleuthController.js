import { User } from "../models/user.model.js";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const handleGoogleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const ticketPayload = ticket.getPayload();
    const { sub: googleId, name, email, picture } = ticketPayload;
    let existingUser = await User.findOne({ email });

    if (!existingUser) {
      const createdUser = await User.create({
        email,
        fullName: name,
        userName: name.slice(0, 3) + googleId.slice(0, 3),
        googleId,
        avatarUrl: picture,
      });
      const accessToken = await createdUser.generateAccessToken();
      const refreshToken = await createdUser.generateRefreshToken();
      const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60 * 1000, 
      };
      res.cookie("refreshToken", refreshToken, options);
      res.cookie("accessToken", accessToken, options);
      res.status(201).json({
        success: true,
        message: "User created successfully",
        user: {
          _id: createdUser._id,
          fullName: createdUser.fullName,
          userName: createdUser.userName,
          email: createdUser.email,
          avatarUrl: createdUser.avatarUrl,
        },
      });
    } else {
      const accessToken = await existingUser.generateAccessToken();
      const refreshToken = await existingUser.generateRefreshToken();
      const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60 * 1000, 
      };
      res.cookie("refreshToken", refreshToken, options);
      res.cookie("accessToken", accessToken, options);
      res.status(200).json({
        success: true,
        message: "User logged in successfully",
        user: {
          _id: existingUser._id,
          fullName: existingUser.fullName,
          userName: existingUser.userName,
          email: existingUser.email,
          avatarUrl: existingUser.avatarUrl,
        },
      });
    }
  } catch (error) {
    console.error("Google login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export default handleGoogleLogin;
