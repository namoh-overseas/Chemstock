import { User } from "../models/user.model.js";

const adminMiddleware = async (req, res, next) => {
    const { _id } = req.user;
    
    const user = await User.findById(_id);
    if (!user) {
        return res.status(401).json({ message: "Unauthorized 1" });
    }
    if (user.role !== "admin") {
        return res.status(401).json({ message: "Unauthorized 2" });
    }
    next();
};

export default adminMiddleware;