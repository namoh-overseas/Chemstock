import { User } from "../models/user.model.js";
import asyncHandler from "../helpers/asyncHandler.js";
import { Product } from "../models/product.model.js";
import { Settings } from "../models/settings.model.js";
import { Request } from "../models/request.model.js";
import { Rating } from "../models/rating.model.js";
import { Buy } from "../models/buy.model.js";
import mongoose from "mongoose";


const getAllUsers = asyncHandler(async (req, res) => {
    const { page = 1, limit = 25 } = req.query;
    if(limit > 50) limit = 50;
    if(limit < 1) limit = 25;
    if(page < 1) page = 1;
    const skip = (page - 1) * limit;
    let usersData = await User.find({
        role: "seller"
    },
        {
            id: true,
            username: true,
            email: true,
            countryCode: true,
            phoneNumber: true,
            isActive: true,
            isVerified: true,
            company: true,
            address: true,
            createdAt: true,
            updatedAt: true,
        }
    ).skip(skip).limit(limit).sort({ createdAt: -1 }).lean();
    const settings = await Settings.findOne();
    if (!settings) {
        return res.status(404).json({ message: "Settings not found" });
    }

    usersData = await Promise.all(usersData.map(async (u) => {
        u.totalProducts = await Product.countDocuments({ seller: u._id });
        return u;
    }))
    res.status(200).json({
        message: "Users fetched successfully", usersData,
        totalUsers: await User.countDocuments(),
        count: usersData.length,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(await User.countDocuments() / limit),
    });
});

const getAllProducts = asyncHandler(async (req, res) => {
    const { page = 1, limit = 25 } = req.query;
    if (limit > 50) limit = 50;
    if (limit < 1) limit = 25;
    if (page < 1) page = 1;
    const skip = (page - 1) * limit;
    const products = await Product.find(
        {},
        {
            id: true,
            name: true,
            price: true,
            currency: true,
            stock: true,
            stockUnit: true,
            sales: true,
            isVisible: true,
            ci: true,
            isFeatured: true,
            tone: true,
            createdAt: true,
            isVerified: true,
            seller: true,
            image: true,
            status: true,
        }
    ).skip(skip).limit(limit).sort({ createdAt: -1 }).lean();

    const settings = await Settings.findOne();
    if (!settings) {
        return res.status(404).json({ message: "Settings not found" });
    }
    const sellerIds = products.map((p) => p.seller.toString());
    const users = await User.find(
        { _id: { $in: sellerIds } },
        { username: 1 }
    )
        .sort({ createdAt: -1 })
        .lean();
    const sellersMap = new Map(
        users.map((u) => [u._id.toString(), u.username])
    );
    let productsData = products.map((p) => ({
        ...p,
        seller: { username: sellersMap.get(p.seller.toString()), id: p.seller } || null
    }));
    res.status(200).json({
        message: "Products found", productsData,
        totalProducts: await Product.countDocuments(),
        count: products.length,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(await Product.countDocuments() / limit),
    });
});

const getUser = asyncHandler(async (req, res) => {
    const { search } = req.query;
    const user = await User.findOne({
        $or: [
            {
                username: { $regex: search, $options: "i" }
            },
            { email: { $regex: search, $options: "i" } },
            { phone: { $regex: search, $options: "i" } },
            { createdAt: { $regex: search, $options: "i" } },
            { updatedAt: { $regex: search, $options: "i" } },
            { _id: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
            { company: { $regex: search, $options: "i" } },
            { address: { $regex: search, $options: "i" } },
            { speciality: { $regex: search, $options: "i" } },
        ]
    });
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User found", user });
});

const toggleProductVisibility = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const product = await Product.findOne({ _id: id });
    if (!product) {
        return res.status(404).json({ message: "Product not found" });
    }
    product.isVisible = !product.isVisible;
    await product.save();
    res.status(200).json({ message: "Product is now " + (product.isVisible ? "visible" : "hidden") });
});

const toggleProductStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const product = await Product.findOne({ _id: id });
    if (!product) {
        return res.status(404).json({ message: "Product not found" });
    }
    product.isVisible = !product.isVisible;
    await product.save();
    res.status(200).json({ message: "Product is now " + (product.isVisible ? "visible" : "hidden") });
});

const toggleUserStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await User.findOne({ _id: id });
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    user.isActive = !user.isActive;
    await user.save();
    res.status(200).json({ message: "User is now " + (user.isActive ? "active" : "inactive") });
});

const deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await User.findOneAndDelete({ _id: id });
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    await Product.deleteMany({ seller: id });
    await Rating.deleteMany({ product: { $in: await Product.find({ seller: id }, { _id: 1 }).lean() } });
    res.status(200).json({ message: "User deleted successfully" });
});

const deleteProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const product = await Product.findOneAndDelete({ _id: id });
    if (!product) {
        return res.status(404).json({ message: "Product not found" });
    }
    await Rating.deleteMany({ product: id });
    res.status(200).json({ message: "Product deleted successfully" });
});

const updateUsdtInrRate = asyncHandler(async (req, res) => {
    const { usdToInrRate } = req.body;
    const settings = await Settings.findOne();
    if (!settings) {
        return res.status(404).json({ message: "Settings not found" });
    }
    settings.usdToInrRate = usdToInrRate;
    await settings.save();
    res.status(200).json({ message: "USDT to INR rate updated successfully" });
})

const toggleFeaturedProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const product = await Product.findOne({ _id: id });

    if (!product) {
        return res.status(404).json({ message: "Product not found" });
    }
    if (!product.isVisible) {
        return res.status(400).json({ message: "Product is not visible" });
    }
    if (product.status !== "active") {
        return res.status(400).json({ message: "Product is not active" });
    }
    if (!product.isVerified) {
        return res.status(400).json({ message: "Product is not verified" });
    }
    if (product.stock <= 0) {
        return res.status(400).json({ message: "Product is out of stock" });
    }

    product.isFeatured = !product.isFeatured;
    await product.save();
    res.status(200).json({ message: "Product featured status updated successfully" });
})

const verifyUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await User.findOne({ _id: id });
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    user.isVerified = true;
    await user.save();
    res.status(200).json({ message: "User verified successfully" });
})

const verifyProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const product = await Product.findOne({ _id: id });
    if (!product) {
        return res.status(404).json({ message: "Product not found" });
    }
    product.isVerified = true;
    await product.save();
    res.status(200).json({ message: "Product verified successfully" });
})

const getRequests = asyncHandler(async (req, res) => {
    const { limit = 25, page = 1 } = req.query;
    if(limit > 50) limit = 50;
    if(limit < 1) limit = 1;
    if(page < 1) page = 1;
    const skip = (page - 1) * limit;
    let requests = await Request.find({}).skip(skip).limit(limit).sort({createdAt: -1}).lean();
    if (!requests) {
        return res.status(404).json({ message: "Requests not found" });
    }
    requests = await Promise.all(requests.map(async (r) => {
        const seller = await User.findOne({ _id: r.seller }, {id: true, username: true});
        if (!seller) {
            r.seller = null;
            return r;
        }
        r.sellerName = seller.username;
        return r;
    }))
    res.status(200).json({
        message: "Requests fetched successfully",
        requests,
        count: requests.length,
        page,
        limit,
        totalRequests: await Request.countDocuments(),
        totalPages: Math.ceil(await Request.countDocuments() / limit),
    });
})

const getRequest = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const request = await Request.findOne({ _id: id });
    if (!request) {
        return res.status(404).json({ message: "Request not found" });
    }
    res.status(200).json({ request });
})

const verifyRequest = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const request = await Request.findOne({ _id: id });
    if (!request) {
        return res.status(404).json({ message: "Request not found" });
    }
    request.isVerified = true;
    await request.save();
    res.status(200).json({ message: "Request verified successfully" });
})

const getRequestUsers = asyncHandler(async (req, res) => {
    const { page = 1, limit = 25 } = req.query;
    if(limit > 50) limit = 50;
    if(limit < 1) limit = 25;
    if(page < 1) page = 1;
    const skip = (page - 1) * limit;
    let usersData = await User.find({
        role: "seller",
        isActive: true,
        isVerified: true,
    },
        {
            id: true,
            username: true,
            email: true,
            countryCode: true,
            phoneNumber: true,
            isActive: true,
            isVerified: true,
            company: true,
            createdAt: true,
            updatedAt: true,
        }
    ).skip(skip).limit(limit).sort({ createdAt: -1 });

    res.status(200).json({
        message: "Users fetched successfully", usersData,
        totalUsers: await User.countDocuments({
            role: "seller",
            isActive: true,
            isVerified: true,
        }),
        count: usersData.length,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(await User.countDocuments({
            role: "seller",
            isActive: true,
            isVerified: true,
        }) / limit),
    });
});

const assignSeller = asyncHandler(async (req, res) => {
    const { requestId, userId } = req.params;
    if (!requestId || !userId) {
        return res.status(400).json({ message: "Request ID and User ID are required" });
    }
    const request = await Request.findOne({ _id: requestId });
    if (!request) {
        return res.status(404).json({ message: "Request not found" });
    }
    if (request.status !== "pending") {
        return res.status(400).json({ message: "Request is already marked as " + request.status });
    }
    if (!request.isVerified) {
        return res.status(400).json({ message: "Request is not verified" });
    }

    const user = await User.findOne({ _id: userId });
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    request.seller = userId;
    await request.save();
    res.status(200).json({ message: "Seller assigned successfully" });
})

const updateRequest = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { contact, name, contactMethod, ci, tone, quantity, stockUnit, note, image } = req.body;
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
    
    const request = await Request.findOne({ _id: id });
    if (!request) {
        return res.status(404).json({ message: "Request not found" });
    }

    
    if (request.status === "pending"){
        request.contact = contact;
        request.name = name;
        request.contactMethod = contactMethod;
        request.ci = ci;
        request.tone = tone;
        request.quantity = quantity;
        request.stockUnit = stockUnit;
        request.note = note;
        request.image = imageUrl;
        await request.save();
        return res.status(200).json({ message: "Request updated successfully" });
    }
    
    return res.status(400).json({ message: "Request cannot be updated" });
})

const searchAssigningSellers = asyncHandler(async(req, res) =>{
    const { page = 1, limit = 25 } = req.query;
    if(limit > 50) limit = 50;
    if(limit < 1) limit = 25;
    if(page < 1) page = 1;
    const skip = (page - 1) * limit;
    const { search } = req.params;
    if (!search) {
        return res.status(400).json({ message: "Search query is required" });
    }
    const users = await User.find({
        role: "seller",
        isActive: true,
        isVerified: true,
        $or: [
            { username: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { company: { $regex: search, $options: "i" } },
            { phoneNumber: { $regex: search, $options: "i" } },
            ...(mongoose.Types.ObjectId.isValid(search) ? [{ _id: new mongoose.Types.ObjectId(search) }] : [])
        ],
    },
        {
            id: true,
            username: true,
            email: true,
            countryCode: true,
            phoneNumber: true,
            isActive: true,
            isVerified: true,
            company: true,
            createdAt: true,
            updatedAt: true,
        }
    ).skip(skip).limit(limit).lean();
    res.status(200).json({
        users,
        message: "Users fetched successfully", 
        count: users.length,
        totalUsers: await User.countDocuments({
            role: "seller",
            isActive: true,
            isVerified: true,
        }),
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(await User.countDocuments({
            role: "seller",
            isActive: true,
            isVerified: true,
        }) / limit),
    });
})

const getProductById = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;

        const product = await Product.findOne({
            $and: [
                { _id: id },
            ]
        },
            {
                id: true,
                name: true,
                description: true,
                price: true,
                ci: true,
                seller: true,
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
});

const updateProduct = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
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
                _id: id,
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
});

const getBuy = async (req, res) => {
    try {
        const { page = 1, limit = 25, sort = "asc" } = req.query;
        if (limit > 50) limit = 50;
        if (limit < 1) limit = 25;
        if (page < 1) page = 1;
        const skip = (page - 1) * limit;
        const { id } = req.user;
        let buy = await Buy.find({ }, {
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
        const totalBuy = await Buy.countDocuments({ });
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

const filterBuyByStatus = async (req, res) => {
    try {
        const { page = 1, limit = 25 } = req.query;
        if (limit < 1) limit = 25;
        if (page < 1) page = 1;
        if (limit > 50) limit = 50;

        const skip = (page - 1) * limit;

        let { status } = req.params;

        if (!status) {
            return res.status(400).json({ message: "Status is required" });
        }

        if (status !== "pending" && status !== "completed" && status !== "cancelled") {
            return res.status(400).json({ message: "Invalid status" });
        }

        let orders = await Buy.find({
            $and: [
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
            totalOrders: await Buy.countDocuments({ status }),
            count: orders.length,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(await Buy.countDocuments({ status }) / limit),
        });
    } catch (error) {
        console.error("Filter buy by status error:", error);
        res.status(500).json({ message: "Something went wrong while filtering buy by status" });
    }
}

const searchBuy = async (req, res) => {
    try {
        const { page = 1, limit = 25 } = req.query;
        if (limit > 50) limit = 50;
        if (limit < 1) limit = 25;
        if (page < 1) page = 1;
        const skip = (page - 1) * limit;
        const { search } = req.params;
        
        if (!search) {
            return res.status(400).json({ message: "Search is required" });
        }
        
        let orders = await Buy.find({
            $or: [
                { buyerName: { $regex: search, $options: "i" } },
                { buyerContact: { $regex: search, $options: "i" } },
                { buyerAddress: { $regex: search, $options: "i" } },
                ...(mongoose.Types.ObjectId.isValid(search) ? [{ _id: new mongoose.Types.ObjectId(search) }] : [])
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
                $or: [
                    { buyerName: { $regex: search, $options: "i" } },
                    { buyerContact: { $regex: search, $options: "i" } },
                    { buyerAddress: { $regex: search, $options: "i" } },
                    ...(mongoose.Types.ObjectId.isValid(search) ? [{ _id: new mongoose.Types.ObjectId(search) }] : [])
                ]
            }),
            count: orders.length,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(await Buy.countDocuments({
                $or: [
                    { buyerName: { $regex: search, $options: "i" } },
                    { buyerContact: { $regex: search, $options: "i" } },
                    { buyerAddress: { $regex: search, $options: "i" } },
                    ...(mongoose.Types.ObjectId.isValid(search) ? [{ _id: new mongoose.Types.ObjectId(search) }] : [])
                ]
            }) / limit),
        });
    } catch (error) {
        console.error("Search buy error:", error);
        res.status(500).json({ message: "Something went wrong while searching buy" });
    }
}

const getAnalytics = asyncHandler(async (req, res) => {
    const unverifiedUsers = await User.countDocuments({ isVerified: false });
    const unverifiedProducts = await Product.countDocuments({ isVerified: false });
    const unverifiedRequests = await Request.countDocuments({ isVerified: false });
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalRequests = await Request.countDocuments();
    const totalOrders = await Buy.countDocuments();
    const completedOrders = await Buy.countDocuments({ status: "completed" });
    const completedRequests = await Request.countDocuments({ status: "completed" });
    const totalRevenue = await Buy.aggregate([
        {
            $match: {
                status: "completed"
            }
        },
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: "$totalAmount" }
            }
        }
    ]);

    const thisMonthUsers = await User.countDocuments({
        createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            $lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
        }
    });

    const thisMonthProducts = await Product.countDocuments({
        createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            $lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
        }
    });

    const thisMonthRequests = await Request.countDocuments({
        createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            $lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
        }
    });

    const thisMonthOrders = await Buy.countDocuments({
        createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            $lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
        }
    });

    const thisMonthRevenue = await Buy.aggregate([
        {
            $match: {
                createdAt: {
                    $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    $lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
                }
            }
        },
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: "$totalAmount" }
            }
        }
    ]);

    const thisMonthCompletedOrders = await Buy.countDocuments({
        createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            $lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
        },
        status: "completed"
    });
    const thisMonthCompletedRequests = await Request.countDocuments({
        createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            $lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
        },
        status: "completed"
    });
    const thisMonthCancelledOrders = await Buy.countDocuments({
        createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            $lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
        },
        status: "cancelled"
    });
    const thisMonthCancelledRequests = await Request.countDocuments({
        createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            $lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
        },
        status: "cancelled"
    });
    
    const thisMonthUsersPercentage = (thisMonthUsers / totalUsers) * 100;
    const thisMonthProductsPercentage = (thisMonthProducts / totalProducts) * 100;
    const thisMonthRequestsPercentage = (thisMonthRequests / totalRequests) * 100;
    const thisMonthOrdersPercentage = (thisMonthOrders / totalOrders) * 100;
    const thisMonthRevenuePercentage = (thisMonthRevenue[0]?.totalRevenue / totalRevenue[0]?.totalRevenue) * 100;

    const cancelledOrders = await Buy.countDocuments({ status: "cancelled" });
    const cancelledRequests = await Request.countDocuments({ status: "cancelled" });

    const completedOrdersPercentage = (completedOrders / totalOrders) * 100;
    const completedRequestsPercentage = (completedRequests / totalRequests) * 100;
    const cancelledOrdersPercentage = (cancelledOrders / totalOrders) * 100;
    const cancelledRequestsPercentage = (cancelledRequests / totalRequests) * 100;
    
    res.status(200).json({
        unverifiedUsers,
        unverifiedProducts,
        unverifiedRequests,
        totalUsers,
        totalProducts,
        totalRequests,
        totalOrders,
        completedOrders,
        completedRequests,
        totalRevenue: totalRevenue[0]?.totalRevenue ?? 0,
        thisMonthUsers,
        thisMonthProducts,
        thisMonthRequests,
        thisMonthOrders,
        thisMonthRevenue: thisMonthRevenue[0]?.totalRevenue ?? 0,
        thisMonthUsersPercentage,
        thisMonthProductsPercentage,
        thisMonthRequestsPercentage,
        thisMonthOrdersPercentage,
        thisMonthRevenuePercentage,
        completedOrdersPercentage,
        completedRequestsPercentage,
        cancelledOrdersPercentage,
        cancelledRequestsPercentage,
        cancelledOrders,
        cancelledRequests,
        thisMonthCompletedOrders,
        thisMonthCompletedRequests,
        thisMonthCancelledOrders,
        thisMonthCancelledRequests,
    });
})


const deleteRequest = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const request = await Request.findByIdAndDelete(id);
    if (!request) {
        return res.status(404).json({ message: "Request not found" });
    }
    res.status(200).json({ message: "Request deleted successfully" });
})


export {
    getAllUsers,
    getAllProducts,
    getUser,
    toggleProductStatus,
    toggleProductVisibility,
    toggleUserStatus,
    deleteUser,
    deleteProduct,
    updateUsdtInrRate,
    toggleFeaturedProduct,
    verifyUser,
    verifyProduct,
    getRequests,
    verifyRequest,
    getRequestUsers,
    assignSeller,
    updateRequest,
    getRequest,
    searchAssigningSellers,
    getProductById,
    updateProduct,
    getBuy,
    filterBuyByStatus,
    searchBuy,
    getAnalytics,
    deleteRequest,
}
