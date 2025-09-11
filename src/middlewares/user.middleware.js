import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const authMiddleware = async (req, res, next) => {
const token = req.cookies.accessToken || req.headers.authorization?.split("Bearer ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const verifyToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(verifyToken.id);
    if (!user) return res.status(401).json({ message: "Unauthorized 3" });

    if (!user.isActive) return res.status(401).json({ message: "User is not active. Please contact the admin." });

    req.user = user;
    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: "Unauthorized 2" });
  }
};


export const refreshTokenMiddleware = (req, res, next) => {
  const refreshToken = req.cookies.refreshToken || req.headers.authorization;
  if (!refreshToken) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const verifyToken = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  if (!verifyToken) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const user = User.findById(verifyToken.id);
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  req.user = user;
  next();
};