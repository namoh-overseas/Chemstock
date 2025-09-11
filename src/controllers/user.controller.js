import { User } from "../models/user.model.js";
import { Product } from "../models/product.model.js";
import asyncHandler from "../helpers/asyncHandler.js";
import { OTP } from "../models/passwordReset.model.js";
import bcrypt from "bcrypt";
import { sendEmailVerificationOTP } from "../helpers/mails/sendOTPVerificationMail.js"
import {sendPasswordResetMail} from "../helpers/mails/sendPasswordResetMail.js"
import { resetPassword } from "../models/passwordReset.model.js";

const accessCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 365 * 24 * 60 * 60 * 1000,
  path: "/",
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 365 * 24 * 60 * 60 * 1000,
  path: "/",
};

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
  const savedUser = await user.save();
  if (!savedUser) {
    return res.status(204).json({ message: "User had been Registered. But due to Server error cannot verify Yet.", type: "continue" });
  }
  const { otp, success } = await sendEmailVerificationOTP(savedUser.email, savedUser.firstName);

    if (success) {
        const hashedOTP = bcrypt.hashSync(otp, 10);
        if (!hashedOTP) return res.status(204).json({ message: "User had been Registered. But due to Server error cannot verify Yet.", type: "continue" });

        const saveOTP = await OTP.create({
            email: savedUser.email,
            OTP: hashedOTP
        });
        if (!saveOTP) return res.status(204).json({ message: "User had been Registered. But due to Server error cannot verify Yet.", type: "continue" });
    }

  // const accessToken = user.generateAccessToken();
  // const refreshToken = user.generateRefreshToken();
  // user.accessToken = accessToken;
  // user.refreshToken = refreshToken;

  return res.status(201)
    // .cookie("accessToken", accessToken, accessCookieOptions)
    // .cookie("refreshToken", refreshToken, cookieOptions)
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

  if (!user.isEmailVerified || user.enableLoginVerification) {
    const { otp, success } = await sendEmailVerificationOTP(user.email, user.firstName);

    if (success) {
        const hashedOTP = bcrypt.hashSync(otp, 10);
        if (!hashedOTP) return res.status(204).json({ message: "Unable to generate OTP, Please try again", type: "continue" });

        const saveOTP = await OTP.create({
            email: user.email,
            OTP: hashedOTP
        });
        if (!saveOTP) return res.status(204).json({ message: "Unable to generate OTP, Please try again", type: "continue" });
    }

  }
  else{
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.accessToken = accessToken;
    user.refreshToken = refreshToken;
    await user.save();
    return res.status(200)
    .cookie("accessToken", accessToken, accessCookieOptions)
    .cookie("refreshToken", refreshToken, refreshCookieOptions)
    .json({
      message: "OTP sent successfully",
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
      isEmailVerified: user.isEmailVerified,
    });
  }

  await user.save();

  return res.status(200)
    .json({
      message: "OTP sent successfully",
      isEmailVerified: false,
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

export const verifyAndAuthenticateUser = async (req, res) => {
  const { otp, email } = req.body;
  if (!otp) return res.status(400).json({ message: "OTP is Required", type: "required" });
  if (!email) return res.status(400).json({ message: "Email is Required", type: "required" });

  const getOTP = await OTP.findOne({ email });
  if (!getOTP) return res.status(403).json({ message: "OTP is Expired", type: "invalid" });

  const user = await User.findOne({
      $or: [
          { email },
          { username: email}
      ]
  });
  if (!user) return res.status(404).json({ message: "User Not Found", type: "missing" });

  const verifyOTP = bcrypt.compareSync(otp, getOTP.OTP);
  if (!verifyOTP) {
      getOTP.retries++;
      getOTP.save();
      return res.status(403).json({ message: "Invalid OTP", type: "invalid" });
  }


  await OTP.findOneAndDelete({ email });

  user.isEmailVerified = true;
  // user.loginAttempt = 0;

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  user.accessToken = accessToken;
  user.refreshToken = refreshToken;
  await user.save();

  res.status(200)
      .cookie("accessToken", accessToken, accessCookieOptions)
      .cookie("refreshToken", refreshToken, refreshCookieOptions)
      .json({
          message: `${user.username} Authenticated Successfully`,
          type: "success",
          user
      })
};

export const resendOTP = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Username/Email is Required", type: "required" });

  const user = await User.findOne({ $or: [{ email }, { username: email }] });
  if (!user) return res.status(404).json({ message: "User not Found", type: "missing" });

  const isOTP = await OTP.findOneAndDelete({ email: user.email });


  const { otp, success } = await sendEmailVerificationOTP(user.email, user.firstName);
  if (!success) return res.status(500).json({ message: "An Error occured while generating OTP", type: "failed" });

  const hashedOTP = bcrypt.hashSync(otp, 10);
  if (!hashedOTP) return res.status(400).json({ message: "Server cannot process the OTP yet", type: "otp" });

  const saveOTP = await OTP.create({
      email: user.email,
      OTP: hashedOTP,
      retries: isOTP ? isOTP.retries : 0
  });
  if (!saveOTP) return res.status(400).json({ message: "Server cannot process the OTP yet", type: "otp" });

  res.status(200).json({ message: "OTP sent successfully", type: "success" });
  return;
};

export const passwordReset = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(403).json({ message: "Username/Email is required", type: "required" });
  const user = await User.findOne({
      $or: [
          { email }
      ]
  });
  if (!user) return res.status(404).json({ message: "User not Found", type: "forbidden" });

  const { success, token } = await sendPasswordResetMail(user.email, user.username, user._id);
  if (!success) return res.status(500).json({ message: "Unexpected server error ", type: "process" });

  const isAvailable = await resetPassword.findOne({ id: user._id });
  if (isAvailable) {
      isAvailable.resetSecret = token;
      isAvailable.save();
  }
  else {
      const reset = await resetPassword.create({
          id: user._id,
          resetSecret: token
      });
      if (!reset) return res.status(500).json({ message: "Unexpected server error ", type: "process" });
      
  }

  res.status(200).json({ message: "Password Reset Mail Sent Successfully", type: "success" });
}

export const authenticateResetLink = async (req, res) => {
  const { password, confirm } = req.body;
  if (password !== confirm) return res.status(400).json({ message: "Confirm Password and Password must be same.", type: "invalid" });

  const { user, resetToken } = req.query;
  const owner = await User.findOne({ _id: user });
  const resetUser = await resetPassword.findOne({ id: user });
  console.log(resetUser);
  
  if (!owner || !resetUser) return res.status(404).json({ message: "Invalid or Expired Link", type: "invalid" });
  if (resetUser.resetSecret != resetToken) return res.status(401).json({ message: "Invalid or Expired Link", type: "invalid" });
  owner.password = password;
  owner.save()
  resetUser.resetSecret = "Null";
  resetUser.save()

  return res.status(200).json({ message: "User Authorised Successfully", type: "success" });
}

export const enableLoginVerification = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Username/Email is Required", type: "required" });

  const user = await User.findOne({ $or: [{ email }, { username: email }] });
  if (!user) return res.status(404).json({ message: "User not Found", type: "missing" });

  user.enableLoginVerification = !user.enableLoginVerification;
  await user.save();

  return res.status(200).json({ message: `Login Verification ${user.enableLoginVerification ? "Enabled" : "Disabled"} Successfully`, type: "success", status: user.enableLoginVerification });
}