import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";



const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: false
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  isEmailVerified: {
    type: Boolean,
    required: false,
    default: false,
  },
  enableLoginVerification: {
    type: Boolean,
    required: false,
    default: true,
  },
  password: {
    type: String,
    required: true,
  },
  role:{
    type: String,
    enum: ["seller", "admin"],
    default: "seller",
  },
  countryCode:{
    type: String,
    required: true,
  },
  phoneNumber:{
    type: String,
    required: true,
  },
  company:{
    type: String,
    required: true,
    default: null,
  },
  description:{
    type: String,
    required: false,
    default: null,
  },
  speciality:{
    type: [String],
    required: false,
    default: null,
  },
  isVerified:{
    type: Boolean,
    required: false,
    default: false,
  },
  isActive:{
    type: Boolean,
    required: false,
    default: true,
  },
  refreshToken: {
    type: String,
    default: null,
  },
  accessToken: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});


userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.verifyPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign({ id: this._id }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "365d",
  });
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign({ id: this._id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "365d",
  });
};


userSchema.methods.verifyRefreshToken = function (token) {
  return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
};

userSchema.methods.verifyAccessToken = function (token) {
  return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
};

const User = mongoose.model("User", userSchema);

export { User};
  