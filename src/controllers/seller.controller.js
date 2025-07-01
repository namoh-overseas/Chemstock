import { Product } from "../models/product.model.js";
import mongoose from "mongoose";
import { Rating } from "../models/rating.model.js";
import { Buy } from "../models/buy.model.js";
import { User } from "../models/user.model.js";
import { uploadFileOnCloudinary } from "../utils/cloudinary.js";
import { Settings } from "../models/settings.model.js";

export const getProducts = async (req, res) => {
    try {
        const { page = 1, limit = 25 } = req.query;
        if (limit > 50) limit = 50;
        if (limit < 1) limit = 25;
        if (page < 1) page = 1;
        const skip = (page - 1) * limit;
        const { id } = req.user;
        const products = await Product.find({ seller: id },
            {
                id: true,
                name: true,
                price: true,
                ci: true,
                tone: true,
                currency: true,
                stock: true,
                stockUnit: true,
                description: true,
                sales: true,
                isVisible: true,
                isFeatured: true,
                isVerified: true,
                image: true,
                status: true,
            }
        ).skip(skip).limit(limit).sort({ createdAt: -1 });

        res.status(200).json({
            message: "Products fetched successfully",
            totalProducts: await Product.countDocuments({ seller: id }),
            count: products.length,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(await Product.countDocuments({ seller: id }) / limit),
            products
        });
    } catch (error) {
        res.status(500).json({ message: "Something went wrong while fetching products" });
    }
}

export const filterProductsByStatus = async (req, res) => {
    try {
        const { page = 1, limit = 25 } = req.query;
        if (limit > 50) limit = 50;
        if (limit < 1) limit = 25;
        if (page < 1) page = 1;
        const skip = (page - 1) * limit;
        const { id } = req.user;
        const products = await Product.find({ seller: id, status: req.query.status },
            {
                id: true,
                name: true,
                price: true,
                ci: true,
                tone: true,
                currency: true,
                stock: true,
                stockUnit: true,
                description: true,
                sales: true,
                isVisible: true,
                isFeatured: true,
                isVerified: true,
                image: true,
                status: true,
            }
        ).skip(skip).limit(limit).sort({ createdAt: -1 });
        res.status(200).json({
            message: "Products fetched successfully", products,
            totalProducts: await Product.countDocuments({ seller: id, status: req.query.status }),
            count: products.length,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(await Product.countDocuments({ seller: id, status: req.query.status }) / limit),
        });
    } catch (error) {
        res.status(500).json({ message: "Something went wrong while fetching products" });
    }
}

export const filterProductsByVisibility = async (req, res) => {
    try {
        const { page = 1, limit = 25 } = req.query;
        if (limit > 50) limit = 50;
        if (limit < 1) limit = 25;
        if (page < 1) page = 1;
        const skip = (page - 1) * limit;
        const { id } = req.user;
        const products = await Product.find({ seller: id, isVisible: req.query.visible },
            {
                id: true,
                name: true,
                price: true,
                ci: true,
                tone: true,
                currency: true,
                stock: true,
                stockUnit: true,
                description: true,
                sales: true,
                isVisible: true,
                isFeatured: true,
                isVerified: true,
                image: true,
                status: true,
            }
        ).skip(skip).limit(limit).sort({ createdAt: -1 });
        res.status(200).json({
            message: "Products fetched successfully", products,
            totalProducts: await Product.countDocuments({ seller: id, isVisible: req.query.visible }),
            count: products.length,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(await Product.countDocuments({ seller: id, isVisible: req.query.visible }) / limit),
        });
    } catch (error) {
        res.status(500).json({ message: "Something went wrong while fetching products" });
    }
}

export const getProductById = async (req, res) => {
    try {
        const { id } = req.user;

        const product = await Product.findOne({
            $and: [
                { _id: req.params.id },
                { seller: id },
                { isVisible: true },
                { status: "active" },
            ]
        },
            {
                name: true,
                description: true,
                price: true,
                ci: true,
                tone: true,
                currency: true,
                stock: true,
                stockUnit: true,
                isFeatured: true,
                image: true,
            }
        );

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.status(200).json({ message: "Product fetched successfully", product });
    } catch (error) {
        console.error("Get Product Error:", error);
        res.status(500).json({ message: "Something went wrong while fetching product" });
    }
};

export const addProduct = async (req, res) => {
    try {
        const {
            name,
            description,
            price,
            ci,
            tone,
            currency,
            stock,
            stockUnit,
            image,
        } = req.body;

        const imageFile = req.file;

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

        if (
            !name?.trim() ||
            !currency?.trim() ||
            !ci?.trim() ||
            !tone?.trim()
        ) {
            return res
                .status(400)
                .json({ message: "All fields are required and must be valid" });
        }

        if (isNaN(price) || isNaN(stock)) {
            return res.status(400).json({ message: "Price and stock must be numbers" });
        }
        const product = await Product.create({
            name: name.trim(),
            description: description.trim(),
            price: parseFloat(price),
            ci: ci.trim(),
            tone: tone.trim(),
            currency: currency.trim(),
            stock: parseFloat(stock),
            stockUnit: stockUnit?.trim() || "",
            image: imageUrl,
            seller: req.user.id,
        });

        if (!product) {
            return res
                .status(400)
                .json({ message: "Something went wrong while creating product" });
        }

        res.status(201).json({
            message: "Product added successfully",
            productId: product._id,
        });
    } catch (error) {
        console.error("Product create error:", error);
        res
            .status(500)
            .json({ message: "Something went wrong while creating product" });
    }
};

export const updateProduct = async (req, res) => {
    try {
        const { id: sellerId } = req.user;
        const {
            name,
            description,
            price,
            ci,
            tone,
            currency,
            stock,
            stockUnit,
            image,
        } = req.body;

        const imageFile = req.file;
        let imageUrl = image;

        if (imageFile) {
            const uploadResult = await uploadFileOnCloudinary(
                imageFile.buffer,
                imageFile.originalname
            );
            if (!uploadResult) {
                return res
                    .status(500)
                    .json({ message: "Failed to upload image" });
            }
            imageUrl = uploadResult.secure_url;
        }

        if (!imageUrl) {
            imageUrl = "/assets/images/default-product.png";
        }

        if (
            !name?.trim() ||
            !currency?.trim() ||
            !ci?.trim() ||
            !tone?.trim()
        ) {
            return res
                .status(400)
                .json({ message: "All fields are required and must be valid" });
        }

        if (isNaN(price) || isNaN(stock)) {
            return res.status(400).json({ message: "Price and stock must be numbers" });
        }

        const updatedProduct = await Product.findOneAndUpdate(
            {
                _id: req.params.id,
                seller: sellerId,
            },
            {
                name: name.trim(),
                description,
                price,
                ci,
                tone,
                currency,
                stock,
                stockUnit,
                image: imageUrl,
            },
            { new: true }
        );

        if (!updatedProduct) {
            return res
                .status(404)
                .json({ message: "Product not found or unauthorized" });
        }

        res.status(200).json({
            message: "Product updated successfully",
        });
    } catch (error) {
        console.error("Update product error:", error);
        res
            .status(500)
            .json({ message: "Something went wrong while updating product" });
    }
};

export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.user;
        const product = await Product.findOneAndDelete({
            $and: [{ _id: req.params.id }, { seller: id }]
        });

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.status(200).json({ message: "Product deleted successfully" });
    } catch (error) {
        console.error("Delete error:", error);
        res.status(500).json({ message: "Something went wrong while deleting product" });
    }
};

export const toggleStatus = async (req, res) => {
    try {
        const { id } = req.user;

        const product = await Product.findOneAndUpdate(
            {
                $and: [
                    { _id: req.params.id },
                    { seller: id },
                    { isVisible: true }
                ]
            },
            { status: req.body.status },
            { new: true }
        );

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        res.status(200).json({ message: "Product is now " + product.status });
    } catch (error) {
        res.status(500).json({ message: "Something went wrong while toggling product status" });
    }
};

export const searchProducts = async (req, res) => {
    try {
        let { search = "", page = 1, limit = 25 } = req.query;

        if (limit < 1) limit = 25;
        if (page < 1) page = 1;
        if (limit > 50) limit = 50;

        if (search.length < 3) return res.status(400).json({ message: "Search must be at least 3 characters long" });
        search = search.trim();
        const skip = (page - 1) * limit;
        const products = await Product.find({
            $and: [
                { 
                    $or: [
                        ...(mongoose.Types.ObjectId.isValid(search) ? [{ _id: new mongoose.Types.ObjectId(search) }] : []), 
                        { name: { $regex: search, $options: "i" } },
                        { description: { $regex: search, $options: "i" } },
                        { ci: { $regex: search, $options: "i" } },
                        { tone: { $regex: search, $options: "i" } },
                    ]
                },
                { isVisible: true },
                { seller: req.user.id },
                { status: "active" }
            ]
        },
            {
                id: true,
                name: true,
                price: true,
                ci: true,
                tone: true,
                currency: true,
                stock: true,
                stockUnit: true,
                sales: true,
                isVisible: true,
                image: true,
                status: true,
            }
        ).skip(skip).limit(limit);
        res.status(200).json({
            message: "Products fetched successfully", products,
            totalProducts: products.length,
            count: products.length,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(products.length / limit),
        });
    } catch (error) {
        res.status(500).json({ message: "Something went wrong while searching products" });
    }
}

export const getAnalytics = async (req, res) => {
    try {
        let { id } = req.user;
        id = new mongoose.Types.ObjectId(id)

        const isVerified = await User.findOne({ _id: id }, { isVerified: 1 });
        if (!isVerified.isVerified) {
            return res.status(403).json({ message: "Seller is not verified", isVerified });
        }

        const productAnalytics = await Product.aggregate([
            {
                $match: {
                    seller: id,
                }
            },
            {
                $addFields: {
                    currency: "$currency",
                }
            },
            {
                $group: {
                    _id: null,
                    products: { $push: "$_id" },
                    addedThisMonth: {
                        $sum: {
                            $cond: [
                                { $gte: ["$createdAt", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] },
                                1,
                                0
                            ]
                        }
                    },
                    totalSales: { $sum: "$sales" },
                    totalProducts: { $sum: 1 },
                    totalRevenue: { $sum: { $multiply: ["$price", "$sales"] } },
                    totalStock: { $sum: "$stock" },
                    totalStockValue: { $sum: { $multiply: ["$price", "$stock"] } },

                    activeProducts: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ["$isVisible", true] }, { $eq: ["$status", "active"] }] },
                                1,
                                0
                            ]
                        }
                    },
                    inactiveProducts: {
                        $sum: {
                            $cond: [
                                { $or: [{ $ne: ["$isVisible", true] }, { $ne: ["$status", "active"] }] },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        const productIds = productAnalytics[0]?.products || [];

        const ratingData = await Rating.aggregate([
            {
                $match: {
                    product: { $in: productIds },
                }
            },
            {
                $group: {
                    _id: null,
                    ratedProducts: { $sum: 1 },
                }
            }
        ]);

        const orderAnalytics = await Buy.aggregate([
            {
                $match: {
                    seller: id,
                }
            },
            {
                $group: {
                    _id: null,
                    lastMonthOrders: { $sum: { $cond: [{ $gte: ["$createdAt", { $subtract: [new Date(), 30 * 24 * 60 * 60 * 1000] }] }, 1, 0] } },
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: "$totalAmount" },
                }
            }
        ]);

        const sellerAnalytics = await User.aggregate([
            {
                $match: {
                    _id: id,
                }
            },
            {
                $project: {
                    rating: true
                }
            },
        ]);

        const settings = await Settings.findOne({}, { usdToInrRate: true }).lean();
        if (!settings) {
            return res.status(500).json({ message: "Settings not found" });
        }

        res.status(200).json({
            message: "Analytics fetched successfully",
            productsAnalytics: productAnalytics[0] || { totalSales: 0, totalProducts: 0, totalStock: 0, totalStockValue: 0, activeProducts: 0, inactiveProducts: 0 },
            ordersAnalytics: orderAnalytics[0] || { totalOrders: 0, totalRevenue: 0 },
            rating: sellerAnalytics[0]?.rating || 0,
            ratedProducts: ratingData[0]?.ratedProducts || 0,
            usdToInrRate: settings.usdToInrRate,
        });
    } catch (error) {
        console.error("Get analytics error:", error);
        res.status(500).json({ message: "Something went wrong while fetching analytics" });
    }
}

export const getVerificationStatus = async (req, res) => {
    try {
        const { id } = req.user;
        const user = await User.findOne({ _id: id }, { isVerified: true });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ isVerified: user.isVerified });
    } catch (error) {
        console.error("Get verification status error:", error);
        res.status(500).json({ message: "Something went wrong while getting verification status" });
    }
}

export const getSellerContact = async (req, res) => {
    try {
        const { id } = req.params;
        const getSellerId = await Product.findOne({ _id: id }, { seller: true });
        if (!getSellerId) {
            return res.status(404).json({ message: "Product not found" });
        }
        const user = await User.findOne({ _id: getSellerId.seller }, { phoneNumber: true, email: true });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ phoneNumber: user.phoneNumber, email: user.email });
    } catch (error) {
        console.error("Get seller contact error:", error);
        res.status(500).json({ message: "Something went wrong while getting seller contact" });
    }
}