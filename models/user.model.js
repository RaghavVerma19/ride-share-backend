import mongoose, { Schema } from "mongoose";
import { type } from "os";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const userSchema = new Schema(
  {
    userName: {
      type: String,
      unique: true,
      required: true,
      index: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    password: {
      type: String,
      required: function(){
        return !this.googleId;
      },
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // allow null values
    },
    avatarUrl: {
      type: String,
    },
    refreshToken: {
      type: String,
    },
    email: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      default:"user"
    },
    bio: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = async function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      userName: this.userName,
      type: this.type,
    },
    process.env.ACCESSTOKEN_SECRET,
    {
      expiresIn: process.env.ACCESSTOKEN_EXPIRY,
    }
  );
};
userSchema.methods.generateRefreshToken = async function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      userName: this.userName,
      type: this.type,
    },
    process.env.REFRESHTOKEN_SECRET,
    {
      expiresIn: process.env.REFRESHTOKEN_EXPIRY,
    }
  );
};

export const User = mongoose.model("User", userSchema);
