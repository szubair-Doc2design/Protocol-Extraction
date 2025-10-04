// backend/server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
require("dotenv").config();

// Models
const Protocol = require("./models/Protocol");
const RtsmInfo = require("./models/RtsmInfo");
const RolesAccess = require("./models/RolesAccess");
const InventoryDefaults = require("./models/InventoryDefaults");
const DrugOrderingResupply = require("./models/DrugOrderingResupply");

// Routes
const drugOrderingResupplyRoutes = require("./routes/drugOrderingResupply");

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.connection.on("connected", () => console.log("✅ MongoDB connected"));
mongoose.connection.on("error", (err) => console.error("❌ MongoDB error:", err));

// File upload setup
const upload = multer({ storage: multer.memoryStorage() });

/* ------------------------------------ */
/* Health Check                         */
/* ------------------------------------ */
app.get("/", (req, res) => {
  res.send("✅ Backend is running fine!");
});

/* ------------------------------------ */
/* Upload via FormData (from frontend)  */
/* ------------------------------------ */
app.post("/api/protocol/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file received" });
    }

    // Convert file buffer to string and parse JSON
    const jsonStr = req.file.buffer.toString("utf8");
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error("❌ Invalid JSON content:", e);
      return res.status(400).json({ success: false, error: "Invalid JSON" });
    }

    await Protocol.findOneAndUpdate(
      {},
      { protocolJson: parsed, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    console.log("✅ Protocol JSON uploaded successfully");
    res.json({ success: true, message: "Protocol JSON uploaded successfully" });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ success: false, error: "Server error during upload" });
  }
});

/* ------------------------------------ */
/* Get latest protocol data             */
/* ------------------------------------ */
app.get("/api/protocol", async (req, res) => {
  try {
    const doc = await Protocol.findOne().sort({ updatedAt: -1 }).lean();
    if (!doc) {
      return res.status(404).json({ success: false, message: "No protocol found" });
    }
    res.json(doc.protocolJson);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ success: false, error: "Failed to read protocol data" });
  }
});

/* ------------------------------------ */
/* Save protocol updates                */
/* ------------------------------------ */
app.post("/api/protocol", async (req, res) => {
  try {
    await Protocol.findOneAndUpdate(
      {},
      { protocolJson: req.body, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Protocol save error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ------------------------------------ */
/* RTSM Info endpoints                  */
/* ------------------------------------ */
app.post("/api/rtsm-info", async (req, res) => {
  try {
    const saved = await RtsmInfo.create(req.body);
    res.json({ success: true, id: saved._id });
  } catch (err) {
    console.error("RTSM Save error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/rtsm-info", async (req, res) => {
  try {
    const docs = await RtsmInfo.find().sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) {
    console.error("RTSM fetch error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ------------------------------------ */
/* Roles & Access endpoints             */
/* ------------------------------------ */
app.get("/api/roles-access", async (req, res) => {
  try {
    const doc = await RolesAccess.findOne().sort({ updatedAt: -1 });
    if (!doc) return res.status(404).json({ message: "No roles found" });
    res.json(doc);
  } catch (err) {
    console.error("Roles fetch error:", err);
    res.status(500).json({ message: "Error fetching roles", error: err });
  }
});

app.post("/api/roles-access", async (req, res) => {
  try {
    const updated = await RolesAccess.findOneAndUpdate(
      {},
      req.body,
      { upsert: true, new: true }
    );
    res.json(updated);
  } catch (err) {
    console.error("Roles save error:", err);
    res.status(500).json({ message: "Error saving roles", error: err });
  }
});

/* ------------------------------------ */
/* Inventory defaults endpoints         */
/* ------------------------------------ */
app.get("/api/inventory-defaults", async (req, res) => {
  try {
    const doc = await InventoryDefaults.findOne().sort({ updatedAt: -1 });
    if (!doc) return res.status(404).json({ message: "No inventory defaults" });
    res.json(doc);
  } catch (err) {
    console.error("Inventory fetch error:", err);
    res.status(500).json({ message: "Error fetching inventory", error: err });
  }
});

app.post("/api/inventory-defaults", async (req, res) => {
  try {
    const updated = await InventoryDefaults.findOneAndUpdate(
      {},
      req.body,
      { upsert: true, new: true }
    );
    res.json(updated);
  } catch (err) {
    console.error("Inventory save error:", err);
    res.status(500).json({ message: "Error saving inventory", error: err });
  }
});

/* ------------------------------------ */
/* Drug Ordering Routes                 */
/* ------------------------------------ */
app.use("/api/drug-ordering-resupply", drugOrderingResupplyRoutes);

/* ------------------------------------ */
/* Start the server                     */
/* ------------------------------------ */
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Backend running on port ${PORT}`));
