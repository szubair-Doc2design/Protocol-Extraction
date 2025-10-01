// routes/rtsmInfo.js
const express = require("express");
const router = express.Router();
const RtsmInfo = require("../models/RtsmInfo");

// Save new RTSM info (POST)
router.post("/", async (req, res) => {
  try {
    const rtsmInfo = new RtsmInfo(req.body);
    const saved = await rtsmInfo.save();
    res.json(saved);
  } catch (err) {
    res.status(500).json({ message: "Error saving RTSM info", error: err });
  }
});

// Get all RTSM info (GET)
router.get("/", async (req, res) => {
  try {
    const all = await RtsmInfo.find({});
    res.json(all);
  } catch (err) {
    res.status(500).json({ message: "Error fetching RTSM info", error: err });
  }
});

module.exports = router;
