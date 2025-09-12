import { User } from "../models/user.model.js";
import { Product } from "../models/product.model.js";
import asyncHandler from "../helpers/asyncHandler.js";
import { OTP } from "../models/passwordReset.model.js";
import bcrypt from "bcrypt";
import { sendEmailVerificationOTP } from "../helpers/mails/sendOTPVerificationMail.js";
import { sendPasswordResetMail } from "../helpers/mails/sendPasswordResetMail.js";
import { resetPassword as ResetPasswordModel } from "../models/passwordReset.model.js";

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 365 * 24 * 60 * 60 * 1000,
    path: "/",
};

const curateUserData = (user) => {
    if (!user) return null;
    return {
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
        isEmailVerified: user.isEmailVerified,
        enableLoginVerification: user.enableLoginVerification,
    };
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
        speciality
    } = req.body;

    if ([username, email, password, phoneNumber, countryCode, company].some((field) => !field || field.trim() === "")) {
        return res.status(400).json({ message: "All required fields must be provided" });
    }

    const userExists = await User.findOne({ $or: [{ email }] });
    if (userExists) {
        return res.status(409).json({ message: "User with this email already exists" });
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

    if (!user) {
        return res.status(500).json({ message: "User registration failed due to a server error." });
    }

    try {
        const { otp, success } = await sendEmailVerificationOTP(user.email, user.username);

        if (success) {
            const hashedOTP = await bcrypt.hash(otp, 10);
            await OTP.create({
                email: user.email,
                OTP: hashedOTP
            });
        }
    } catch (error) {
        console.error("Failed to send OTP during registration:", error);
    }
    
    return res.status(201).json({
        message: "User registered successfully. Please check your email to verify your account.",
        user: curateUserData(user)
    });
});

export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ $or: [{ email: { $regex: `^${email}$`, $options: "i" } }, { phoneNumber: email }] });

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await user.verifyPassword(password);
    if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.isActive) {
        return res.status(403).json({ message: "Your account is inactive. Please contact support." });
    }

    if (!user.isEmailVerified || user.enableLoginVerification) {
        const { otp, success } = await sendEmailVerificationOTP(user.email, user.username);

        if (success) {
            const hashedOTP = await bcrypt.hash(otp, 10);
            await OTP.updateOne({ email: user.email }, { OTP: hashedOTP }, { upsert: true });
            
            return res.status(200).json({
                message: "An OTP has been sent to your email for verification.",
                isEmailVerified: false,
            });
        } else {
            return res.status(500).json({ message: "Failed to send OTP. Please try again." });
        }
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return res.status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json({
            message: "User logged in successfully",
            user,
            isEmailVerified: true,
        });
});

export const logout = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        { $unset: { refreshToken: 1 } },
        { new: true }
    );

    return res.status(200)
        .cookie("accessToken", "", cookieOptions)
        .cookie("refreshToken", "", cookieOptions)
        .json({ message: "Logged out successfully" });
});

export const getFeaturedProducts = asyncHandler(async (req, res) => {
    const featuredProducts = await Product.find({
        isFeatured: true,
        isVisible: true,
        status: "active",
        isVerified: true
    });
    return res.status(200).json(featuredProducts);
});


export const verifyAndAuthenticateUser = asyncHandler(async (req, res) => {
    const { otp, email } = req.body;
    if (!otp) return res.status(400).json({ message: "OTP is required" });
    if (!email) return res.status(400).json({ message: "Email is required" });

    const otpDoc = await OTP.findOne({ $or: [{ email }] });
    if (!otpDoc) return res.status(400).json({ message: "OTP has expired or is invalid" });

    const isOtpValid = await bcrypt.compare(otp, otpDoc.OTP);
    if (!isOtpValid) {
        return res.status(400).json({ message: "Invalid OTP provided" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    await OTP.findByIdAndDelete(otpDoc._id);

    user.isEmailVerified = true;
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return res.status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json({
            message: `${user.username} authenticated successfully`,
            user: curateUserData(user),
            accessToken,
        });
});


export const resendOTP = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    await OTP.findOneAndDelete({ email: user.email });

    const { otp, success } = await sendEmailVerificationOTP(user.email, user.username);
    if (!success) return res.status(500).json({ message: "An error occurred while sending the OTP" });

    const hashedOTP = await bcrypt.hash(otp, 10);
    await OTP.create({
        email: user.email,
        OTP: hashedOTP,
    });

    return res.status(200).json({ message: "OTP sent successfully" });
});


export const passwordReset = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const { success, token } = await sendPasswordResetMail(user.email, user.username, user._id);
    if (!success) return res.status(500).json({ message: "Unexpected server error while sending email" });

    await ResetPasswordModel.updateOne(
        { id: user._id },
        { resetSecret: token },
        { upsert: true }
    );

    return res.status(200).json({ message: "Password reset mail sent successfully" });
});


export const authenticateResetLink = asyncHandler(async (req, res) => {
    const { password, confirm } = req.body;
    if (password !== confirm) return res.status(400).json({ message: "Passwords do not match" });

    const { user, resetToken } = req.query;

    const resetDoc = await ResetPasswordModel.findOne({ id: user });

    if (!resetDoc || resetDoc.resetSecret !== resetToken) {
        return res.status(400).json({ message: "Invalid or expired password reset link" });
    }

    const isuser = await User.findById(user);
    if (!isuser) {
        return res.status(400).json({ message: "Invalid or expired password reset link" });
    }

    isuser.password = password;
    await isuser.save();

    await ResetPasswordModel.findByIdAndDelete(resetDoc._id);

    return res.status(200).json({ message: "Password has been reset successfully. You can now log in." });
});

export const enableLoginVerification = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.enableLoginVerification = !user.enableLoginVerification;
    await user.save({ validateBeforeSave: false });

    const status = user.enableLoginVerification ? "Enabled" : "Disabled";

    return res.status(200).json({
        message: `Login verification ${status} successfully`,
        status: user.enableLoginVerification
    });
});