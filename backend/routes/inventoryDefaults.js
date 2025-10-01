const express = require("express");
const router = express.Router();
const InventoryDefaults = require("../models/InventoryDefaults");

// GET inventory defaults - get latest document
router.get("/", async (req, res) => {
  try {
    const data = await InventoryDefaults.findOne().sort({ updatedAt: -1 });
    if (!data) return res.status(404).json({ message: "No inventory defaults found" });
    res.json(data);
  } catch (err) {
    console.error("Error fetching inventory defaults", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST inventory defaults - save or update document
router.post("/", async (req, res) => {
  try {
    const data = req.body;
    const saved = await InventoryDefaults.findOneAndUpdate({}, data, { upsert: true, new: true });
    res.json(saved);
  } catch (err) {
    console.error("Error saving inventory defaults", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
