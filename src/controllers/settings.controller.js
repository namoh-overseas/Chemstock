import { Settings } from "../models/settings.model.js";
import asyncHandler from "../helpers/asyncHandler.js";

export const initializeSettings = async () => {
  try {
    const count = await Settings.estimatedDocumentCount();

    if (count === 0) {
      await Settings.create({
        usdToInrRate: 85,
      });
    }
  } catch (err) {
    console.error("Error initializing settings:", err);
  }
};

export const updateSettings = asyncHandler(async (req, res) => {
    const { usdToInrRate } = req.body;
    const settings = await Settings.findOne();
    if (!settings) {
        return res.status(404).json({ message: "Settings not found" });
    }
    settings.usdToInrRate = usdToInrRate;
    await settings.save();
    res.status(200).json({ message: "Settings updated successfully" });
})

export const getUsdInrRate = asyncHandler(async (req, res) => {
    const settings = await Settings.findOne();
    if (!settings) {
        return res.status(404).json({ message: "Settings not found" });
    }
    res.status(200).json({ usdToInrRate: settings.usdToInrRate });
})