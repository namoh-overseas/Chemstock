import asyncHandler from "../helpers/asyncHandler.js";
import { Rating } from "../models/rating.model.js";
import { Product } from "../models/product.model.js";

export const addRating = asyncHandler(async (req, res) => {
    const { name, email, id, rating, comment } = req.body;
  
    if (!name || !email || !id || !rating || !comment) {
      return res.status(400).json({ message: "All fields are required" });
    }
  
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
  
    const newRating = await Rating.create({
      name,
      email,
      product: id,
      rating,
      comment,
    });
  
    if (!newRating) {
      return res.status(400).json({ message: "Something went wrong while creating rating" });
    }
  
    res.status(201).json({
      message: "Product has been rated successfully",
      ratings: newRating,
      totalRatings: await Rating.countDocuments({ product: id }),
    });
  });
  
