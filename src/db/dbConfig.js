//./db/dbConfig.js
import mongoose from "mongoose"
import dotenv from "dotenv"
import { initializeSettings } from "../controllers/settings.controller.js";

dotenv.config({
    path: "./.env"
})


// DATABASE CONNECTION
const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(process.env.MONGODB_URI);
        await initializeSettings();
        
        console.log("MongoDB connection success at port :",connectionInstance.connection.port);
    } catch (error) {
        console.log("MongoDB connection error :((",error);
    }
}

export default connectDB