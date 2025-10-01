const express = require("express");
const router = express.Router();
const RolesAccess = require("../models/RolesAccess");

// Get current Roles and Access config
router.get("/", async (req, res) => {
  try {
    const data = await RolesAccess.findOne().sort({ updatedAt: -1 });
    if (!data) return res.status(404).json({ message: "No roles and access data found" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Error fetching roles and access data", error: err });
  }
});

// Save or update Roles and Access config
router.post("/", async (req, res) => {
  try {
    const { systemRoles, roleMatrix } = req.body;
    const updated = await RolesAccess.findOneAndUpdate(
      {},
      { systemRoles, roleMatrix, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Error saving roles and access data", error: err });
  }
});

module.exports = router;
