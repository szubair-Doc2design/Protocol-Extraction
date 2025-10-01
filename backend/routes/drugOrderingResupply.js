const express = require("express");
const router = express.Router();
const DrugOrderingResupply = require("../models/DrugOrderingResupply");

// GET latest drug ordering resupply config
router.get("/", async (req, res) => {
  try {
    const data = await DrugOrderingResupply.findOne().sort({ updatedAt: -1 });
    if (!data) return res.status(404).json({ message: "No drug ordering resupply data found" });
    res.json(data);
  } catch (err) {
    console.error("Error fetching drug ordering resupply", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST save drug ordering resupply config
router.post("/", async (req, res) => {
  try {
    const data = req.body;
    const saved = await DrugOrderingResupply.findOneAndUpdate({}, data, { upsert: true, new: true });
    res.json(saved);
  } catch (err) {
    console.error("Error saving drug ordering resupply", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
