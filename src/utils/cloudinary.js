import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
dotenv.config({
    path: "./.env",
});

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload file to Cloudinary
 * @param fileBuffer 
 * @param fileName - Original file name
 */

export async function uploadFileOnCloudinary(fileBuffer, fileName){
    try {
        const base64File = `data:image/png;base64,${fileBuffer.toString("base64")}`;
        const formattedFileName = fileName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_.]/g, "");

        const uploadResult = await cloudinary.uploader.upload(base64File, {
            public_id: `${formattedFileName}`,
            overwrite: true,
            resource_type: "auto",
        });
        if (!uploadResult) {
            return null;
        }

        return uploadResult;
    } catch (error) {
        console.error("Cloudinary Upload Error:", error);
        throw new Error("Failed to upload file to Cloudinary");
    }
}