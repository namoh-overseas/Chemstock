import { Request } from "../models/request.model.js";
import { User } from "../models/user.model.js";
import asyncHandler from "../helpers/asyncHandler.js";
import { uploadFileOnCloudinary } from "../utils/cloudinary.js";
import mongoose from "mongoose";

export const addRequest = asyncHandler(async (req, res) => {
    const { contact, name, contactMethod,countryCode, ci, tone, quantity, stockUnit, note, image } = req.body;
    const imageFile = req.file;
    if (!name || !contactMethod || !contact || !quantity) {
        return res.status(400).json({ message: "All fields are required" });
    }
    let imageUrl = image;
    if (imageFile) {
        const uploadResult = await uploadFileOnCloudinary(
            imageFile.buffer,
            imageFile.originalname
        );

        if (!uploadResult) {
            return res.status(500).json({ message: "Failed to upload image" });
        }
        imageUrl = uploadResult.secure_url;
    }

    if (!imageUrl) {
        imageUrl = "/assets/images/default-product.png";
    }
    const request = await Request.create({
        name,
        contactMethod,
        contact,
        countryCode,
        ci,
        tone,
        quantity,
        stockUnit,
        note,
        image: imageUrl
    });
    res.status(201).json({ request });
});

export const getRequests = asyncHandler(async (req, res) => {
    const { limit = 25, page = 1 } = req.query;
    if(limit > 50) limit = 50;
    if(limit < 1) limit = 1;
    if(page < 1) page = 1;
    const skip = (page - 1) * limit;
    const {id}   = req.user;
    const requests = await Request.find({seller: id}).skip(skip).limit(limit).sort({createdAt: -1}).lean();
    if (!requests) {
        return res.status(404).json({ message: "Requests not found" });
    }
    res.status(200).json({
        message: "Requests fetched successfully",
        requests,
        count: requests.length,
        page,
        limit,
        totalRequests: await Request.countDocuments({seller: id}),
        totalPages: Math.ceil(await Request.countDocuments({seller: id}) / limit),
    });
})

export const getUserRequests = asyncHandler(async (req, res) => {
    const {requests} = req.query;
    let requestsData = await Request.find({_id: { $in: requests }}).sort({createdAt: -1}).lean();
    if (!requestsData) {
        return res.status(404).json({ message: "Requests not found" });
    }
    requestsData = await Promise.all(requestsData.map(async (r) => {
        const seller = await User.findOne({ _id: r.seller }, {id: true, company: true, phoneNumber:true, email:true});
        if (!seller) {
            r.seller = null;
            return r;
        }
        r.sellerName = seller.company;
        r.sellerContact = seller.phoneNumber;
        r.sellerEmail = seller.email;
        return r;
    }))
    
    res.status(200).json({
        message: "Requests fetched successfully",
        requestsData,
        count: requestsData.length,
    });
})

export const updateRequestStatus = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!id || !status) {
            return res.status(400).json({ message: "All fields are required" });
        }
        
        const request = await Request.findOne({ _id: id, seller: req.user.id });
        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }
        if (request.status === "completed") {
            return res.status(400).json({ message: "Request already completed" });
        }

        if (request.status === "cancelled") {
            return res.status(400).json({ message: "Request already cancelled" });
        }


        request.status = status;
        await request.save();
        res.status(200).json({ message: "Request now marked as " + status });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
})

export const getPublicRequests = asyncHandler(async (req, res) => {
    const { limit = 25, page = 1 } = req.query;
    if(limit > 50) limit = 50;
    if(limit < 1) limit = 1;
    if(page < 1) page = 1;
    const skip = (page - 1) * limit;

    const requests = await Request.find({
        status: "pending",
        isVerified: true,
        seller: null,
    }).skip(skip).limit(limit).sort({createdAt: -1}).lean();
    if (!requests) {
        return res.status(404).json({ message: "Requests not found" });
    }
    res.status(200).json({
        message: "Requests fetched successfully",
        requests,
        count: requests.length,
        page,
        limit,
        totalRequests: await Request.countDocuments({
            status: "pending",
            isVerified: true,
            seller: null,
        }),
        totalPages: Math.ceil(await Request.countDocuments({
            status: "pending",
            isVerified: true,
            seller: null,
        }) / limit),
    });
})

export const searchPublicRequests = asyncHandler(async (req, res) => {
    const { limit = 25, page = 1 } = req.query;
    if(limit > 50) limit = 50;
    if(limit < 1) limit = 1;
    if(page < 1) page = 1;
    const skip = (page - 1) * limit;
    const { search } = req.params;

    const requests = await Request.find({
        $or: [
            { name: { $regex: search, $options: "i" } },
            { ci: { $regex: search, $options: "i" } },
            { tone: { $regex: search, $options: "i" } },
            { note: { $regex: search, $options: "i" } },
            ...(mongoose.Types.ObjectId.isValid(search) ? [{ _id: new mongoose.Types.ObjectId(search) }] : [])
        ],
        status: "pending",
        isVerified: true,
        seller: null,
    }).skip(skip).limit(limit).sort({createdAt: -1}).lean();
    if (!requests) {
        return res.status(404).json({ message: "Requests not found" });
    }
    res.status(200).json({
        message: "Requests fetched successfully",
        requests,
        count: requests.length,
        page,
        limit,
        totalRequests: await Request.countDocuments({
            status: "pending",
            isVerified: true,
            seller: null,
        }),
        totalPages: Math.ceil(await Request.countDocuments({
            status: "pending",
            isVerified: true,
            seller: null,
        }) / limit),
    });
})

export const totalRequests = asyncHandler(async (req, res) => {
    const totalRequests = await Request.countDocuments({
        status: "pending",
        isVerified: true,
        seller: null,
    });
    res.status(200).json({
        message: "Total requests fetched successfully",
        totalRequests,
    });
})