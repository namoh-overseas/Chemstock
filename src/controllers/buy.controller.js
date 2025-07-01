import { Buy } from "../models/buy.model.js";
import { Product } from "../models/product.model.js";
import { User } from "../models/user.model.js";
import { Settings } from "../models/settings.model.js";
import mongoose from "mongoose";

export const createBuy = async (req, res) => {
    try {
        const { id } = req.params;

        let {
            buyerName,
            buyerContact,
            contactMethod,
            quantity,
            note
        } = req.body;

        if (!id || !buyerName || !buyerContact || !contactMethod || !quantity) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (note) {
            if (note.length > 500) {
                return res.status(400).json({ message: "Note should be less than 500 characters" });
            }
        }

        if (quantity <= 0) {
            quantity = 1;
        }

        const productData = await Product.findOne({ _id: id });


        if (!productData) {
            return res.status(404).json({ message: "Product not found" });
        }

        const sellerData = await User.findOne({ _id: productData.seller });
        if (!sellerData) {
            return res.status(404).json({ message: "Seller not found" });
        }

        if (sellerData.role !== "seller") {
            return res.status(403).json({ message: "Seller not authorized" });
        }

        if (!sellerData.isActive) {
            return res.status(403).json({ message: "Seller not active" });
        }

        let totalAmount;
        if (productData.currency === "USD") {
            const settings = await Settings.findOne({}, { usdToInrRate: true }).lean();
            if (!settings) {
                return res.status(500).json({ message: "Settings not found" });
            }
            totalAmount = (productData.price * quantity) / settings.usdToInrRate;
        } else {
            totalAmount = productData.price * quantity;
        }

        const buy = await Buy.create({
            product: id,
            buyerName,
            buyerContact,
            contactMethod,
            quantity,
            price: productData.price,
            currency: productData.currency,
            totalAmount,
            note,
            seller: sellerData.id,
            sellerName: sellerData.username,
            sellerContact: sellerData.phoneNumber
        });
        res.status(201).json({ message: "Buy created successfully", buy });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export const updateBuy = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!id || !status) {
            return res.status(400).json({ message: "All fields are required" });
        }
        
        const buy = await Buy.findOne({ _id: id, seller: req.user.id });
        if (!buy) {
            return res.status(404).json({ message: "Order not found" });
        }
        const product = await Product.findOne({ _id: buy.product });
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }


        if (buy.status === "completed") {
            return res.status(400).json({ message: "Order already completed" });
        }

        if (buy.status === "cancelled") {
            return res.status(400).json({ message: "Order already cancelled" });
        }


        buy.status = status;
        if (status === "completed") {
            if (product.stock < buy.quantity) {
                return res.status(400).json({ message: "Not enough stock" });
            }
            product.sales += buy.quantity;
            product.stock -= buy.quantity;
        }
        await product.save();
        await buy.save();
        res.status(200).json({ message: "Order now marked as " + status });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export const getBuy = async (req, res) => {
    try {
        const { page = 1, limit = 25, sort = "asc" } = req.query;
        if (limit > 50) limit = 50;
        if (limit < 1) limit = 25;
        if (page < 1) page = 1;
        const skip = (page - 1) * limit;
        const { id } = req.user;
        let buy = await Buy.find({ seller: id }, {
            id: true,
            product: true,
            buyerName: true,
            buyerContact: true,
            contactMethod: true,
            quantity: true,
            price: true,
            note: true,
            currency: true,
            totalAmount: true,
            status: true,
            createdAt: true,
            updatedAt: true
        }).skip(skip).limit(limit).sort({ createdAt: sort }).lean();
        if (!buy) {
            return res.status(404).json({ message: "Orders not found" });
        }
        const totalBuy = await Buy.countDocuments({ seller: id });
        const settings = await Settings.findOne({}, { usdToInrRate: true }).lean();
        if (!settings) {
            return res.status(404).json({ message: "Settings not found" });
        }

        buy = await Promise.all(buy.map(async b => {
            const product = await Product.findOne({ _id: b.product }, { name: true });
            return {
                ...b,
                productName: product?.name ?? null,
            };
        }))

        res.status(200).json({
            message: "Orders fetched successfully", buy,
            totalBuy,
            count: buy.length,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(totalBuy / limit),
            usdToInrRate: settings?.usdToInrRate ?? null,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export const filterBuyByStatus = async (req, res) => {
    try {
        const { page = 1, limit = 25 } = req.query;
        if (limit < 1) limit = 25;
        if (page < 1) page = 1;
        if (limit > 50) limit = 50;

        const skip = (page - 1) * limit;

        const { id } = req.user;

        let { status } = req.query;

        if (!status) {
            return res.status(400).json({ message: "Status is required" });
        }

        if (status !== "pending" && status !== "completed" && status !== "cancelled") {
            return res.status(400).json({ message: "Invalid status" });
        }

        let orders = await Buy.find({
            $and: [
                { seller: id },
                { status }
            ]
        },
            {
                id: true,
                product: true,
                buyerName: true,
                buyerContact: true,
                contactMethod: true,
                buyerAddress: true,
                quantity: true,
                price: true,
                note: true,
                currency: true,
                totalAmount: true,
                status: true,
                createdAt: true,
                updatedAt: true
            }
        ).skip(skip).limit(limit).lean();

        orders = await Promise.all(orders.map(async o => {
            const product = await Product.findOne({ _id: o.product }, { name: true });
            return {
                ...o,
                productName: product?.name ?? null,
            };
        }))

        res.status(200).json({
            message: "Orders fetched successfully", orders,
            totalOrders: await Buy.countDocuments({ seller: id, status }),
            count: orders.length,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(await Buy.countDocuments({ seller: id, status }) / limit),
        });
    } catch (error) {
        console.error("Filter buy by status error:", error);
        res.status(500).json({ message: "Something went wrong while filtering buy by status" });
    }
}

export const searchBuy = async (req, res) => {
    try {
        const { page = 1, limit = 25 } = req.query;
        if (limit > 50) limit = 50;
        if (limit < 1) limit = 25;
        if (page < 1) page = 1;
        const skip = (page - 1) * limit;
        const { search } = req.params;
        const { id } = req.user;
        
        if (!search) {
            return res.status(400).json({ message: "Search is required" });
        }
        
        let orders = await Buy.find({
            $and: [
                { seller: id },
                { $or: [
                    { buyerName: { $regex: search, $options: "i" } },
                    { buyerContact: { $regex: search, $options: "i" } },
                    { buyerAddress: { $regex: search, $options: "i" } },
                    ...(mongoose.Types.ObjectId.isValid(search) ? [{ _id: new mongoose.Types.ObjectId(search) }] : [])
                ] }
            ]
        },
            {
                id: true,
                product: true,
                buyerName: true,
                buyerContact: true,
                contactMethod: true,
                buyerAddress: true,
                quantity: true,
                price: true,
                note: true,
                currency: true,
                totalAmount: true,
                status: true,
                createdAt: true,
                updatedAt: true
            }
        ).skip(skip).limit(limit).lean();
        
        orders = await Promise.all(orders.map(async o => {
            const product = await Product.findOne({ _id: o.product }, { name: true });
            return {
                ...o,
                productName: product?.name ?? null,
            };
        }))
        
        res.status(200).json({
            message: "Orders fetched successfully", orders,
            totalOrders: await Buy.countDocuments({
                $and: [
                    { seller: id },
                    { $or: [
                        { buyerName: { $regex: search, $options: "i" } },
                        { buyerContact: { $regex: search, $options: "i" } },
                        { buyerAddress: { $regex: search, $options: "i" } },
                        ...(mongoose.Types.ObjectId.isValid(search) ? [{ _id: new mongoose.Types.ObjectId(search) }] : [])
                    ] }
                ]
            }),
            count: orders.length,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(await Buy.countDocuments({
                $and: [
                    { seller: id },
                    { $or: [
                        { buyerName: { $regex: search, $options: "i" } },
                        { buyerContact: { $regex: search, $options: "i" } },
                        { buyerAddress: { $regex: search, $options: "i" } },
                        ...(mongoose.Types.ObjectId.isValid(search) ? [{ _id: new mongoose.Types.ObjectId(search) }] : [])
                    ] }
                ]
            }) / limit),
        });
    } catch (error) {
        console.error("Search buy error:", error);
        res.status(500).json({ message: "Something went wrong while searching buy" });
    }
}