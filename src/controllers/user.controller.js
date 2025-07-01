import { User } from "../models/user.model.js";
import { Settings } from "../models/settings.model.js";
import { Product } from "../models/product.model.js";
import asyncHandler from "../helpers/asyncHandler.js";

export const register = asyncHandler(async (req, res) => {
  const {
    username,
    email,
    password,
    countryCode,
    phoneNumber,
    company,
    description,
    speciality } = req.body;
  if (!username || !email || !password || !phoneNumber || !countryCode || !company) {
    return res.status(400).json({ message: "All fields are required" });
  }
  const userExists = await User.findOne({ $or: [{ email }, { phoneNumber }] });
  if (userExists) {
    return res.status(409).json({ message: "User with this email or phone number already exists" });
  }

  const user = await User.create({
    username,
    email,
    password,
    countryCode,
    phoneNumber,
    company,
    description,
    speciality
  });

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  user.accessToken = accessToken;
  user.refreshToken = refreshToken;
  await user.save();

  const accessCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 365 * 24 * 60 * 60 * 1000,
    path: "/",
  };

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 365 * 24 * 60 * 60 * 1000,
    path: "/",
  };

  return res.status(201)
    .cookie("accessToken", accessToken, accessCookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json({
      message: "User registered successfully",
      id: user._id,
      username: user.username,
      email: user.email,
      phoneNumber: user.phoneNumber,
      company: user.company,
      description: user.description,
      speciality: user.speciality,
      defaultCurrency: user.defaultCurrency,
      role: user.role,
      isActive: user.isActive,
    });
})

export const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }
  const user = await User.findOne({ $or: [{ email: { $regex: email, $options: "i" } }, { phoneNumber: email }] });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  const isMatch = await user.verifyPassword(password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  if (!user.isActive) {
    return res.status(401).json({ message: "User is not active. Please contact the admin." });
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.accessToken = accessToken;
  user.refreshToken = refreshToken;
  await user.save();

  const accessCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 365 * 24 * 60 * 60 * 1000,
    path: "/",
  };

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 365 * 24 * 60 * 60 * 1000,
    path: "/",
  };

  return res.status(200)
    .cookie("accessToken", accessToken, accessCookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json({
      message: "User logged in successfully",
      id: user._id,
      username: user.username,
      email: user.email,
      countryCode: user.countryCode,
      phoneNumber: user.phoneNumber,
      company: user.company,
      description: user.description,
      speciality: user.speciality,
      role: user.role,
      isActive: user.isActive,
      isVerified: user.isVerified,
    });
};

export const logout = asyncHandler(async (req, res) => {
  const user = req.user;
  user.accessToken = null;
  user.refreshToken = null;

  await user.save();
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  res.status(200).json({ message: "Logged out successfully" });
})


export const getFeaturedProducts = asyncHandler(async (req, res) => {
  const featuredProducts = await Product.find({
    isFeatured: true,
    isVisible: true,
    status: "active",
    isVerified: true
  });
  res.status(200).json(featuredProducts);
})
