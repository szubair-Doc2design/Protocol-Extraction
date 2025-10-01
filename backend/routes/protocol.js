// backend/routes/protocol.js
const express = require("express");
const router = express.Router();
const Protocol = require("../models/Protocol");

// POST save protocol data
router.post("/", async (req, res) => {
  try {
    const protocol = new Protocol(req.body);
    const saved = await protocol.save();
    res.json(saved);
  } catch (err) {
    res.status(500).json({ message: "Error saving protocol", error: err });
  }
});

// GET all protocol data
router.get("/", async (req, res) => {
  try {
    const allProtocols = await Protocol.find({});
    res.json(allProtocols);
  } catch (err) {
    res.status(500).json({ message: "Error fetching protocols", error: err });
  }
});

module.exports = router;
