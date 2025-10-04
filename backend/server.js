// backend/server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
require("dotenv").config();

console.log("Loaded MONGO_URI:", process.env.MONGO_URI ? "✅ Found" : "❌ Missing");

// Models
const Protocol = require("./models/Protocol");
const RtsmInfo = require("./models/RtsmInfo");
const RolesAccess = require("./models/RolesAccess");
const InventoryDefaults = require("./models/InventoryDefaults");
const DrugOrderingResupply = require("./models/DrugOrderingResupply");

// Routes
const drugOrderingResupplyRoutes = require("./routes/drugOrderingResupply");

const app = express();

// ✅ CORS FIX — Allow your Vercel frontend
const allowedOrigins = [
  "https://protocol-extraction-5gcv.vercel.app", // your frontend
  "http://localhost:3000" // local testing (optional)
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS not allowed for this origin: " + origin));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(bodyParser.json());
const upload = multer({ storage: multer.memoryStorage() });

// ✅ MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

/* ------------------------------------ */
/* Health Check                         */
/* ------------------------------------ */
app.get("/", (req, res) => {
  res.send("✅ Backend is running successfully");
});

/* ------------------------------------ */
/* Quick Status Route (for testing)     */
/* ------------------------------------ */
app.get("/status", async (req, res) => {
  try {
    const mongoState = mongoose.connection.readyState === 1 ? "Connected" : "Disconnected";
    res.json({
      success: true,
      mongoStatus: mongoState,
      message: "Backend and MongoDB status check",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Status check failed", error: err.message });
  }
});

/* ------------------------------------ */
/* File Upload Endpoint (Frontend uses this) */
/* ------------------------------------ */
app.post("/api/protocol/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: "No file uploaded" });

    const jsonStr = req.file.buffer.toString("utf8").trim();
    if (!jsonStr) return res.status(400).json({ success: false, error: "Empty JSON file" });

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error("❌ JSON parse error:", e);
      return res.status(400).json({ success: false, error: "Invalid JSON format" });
    }

    await Protocol.findOneAndUpdate(
      {},
      { protocolJson: parsed, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    console.log("✅ JSON uploaded successfully");
    res.json({ success: true, message: "Protocol JSON uploaded successfully" });
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ success: false, error: "Server error while uploading" });
  }
});

/* ------------------------------------ */
/* Dashboard Protocol APIs              */
/* ------------------------------------ */
app.get("/api/protocol", async (req, res) => {
  try {
    const doc = await Protocol.findOne().sort({ updatedAt: -1 }).lean();
    if (!doc) return res.status(404).json({ message: "No protocol data found" });
    res.json(doc.protocolJson);
  } catch (err) {
    res.status(500).json({ message: "Error reading protocol data" });
  }
});

app.post("/api/protocol", async (req, res) => {
  try {
    await Protocol.findOneAndUpdate(
      {},
      { protocolJson: req.body, updatedAt: new Date() },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ------------------------------------ */
/* RTSM Info Endpoints                  */
/* ------------------------------------ */
app.post("/api/rtsm-info", async (req, res) => {
  try {
    const saved = await RtsmInfo.create(req.body);
    res.json({ success: true, id: saved._id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/rtsm-info", async (req, res) => {
  try {
    const docs = await RtsmInfo.find({}).sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: "Error fetching RTSM info" });
  }
});

/* ------------------------------------ */
/* Roles and Access Endpoints           */
/* ------------------------------------ */
app.get("/api/roles-access", async (req, res) => {
  try {
    const doc = await RolesAccess.findOne().sort({ updatedAt: -1 });
    if (!doc) return res.status(404).json({ message: "No roles and access data found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: "Error fetching roles and access data" });
  }
});

app.post("/api/roles-access", async (req, res) => {
  try {
    const { systemRoles, roleMatrix } = req.body;
    const updated = await RolesAccess.findOneAndUpdate(
      {},
      { systemRoles, roleMatrix, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Error saving roles and access data" });
  }
});

/* ------------------------------------ */
/* Inventory Defaults Endpoints         */
/* ------------------------------------ */
app.get("/api/inventory-defaults", async (req, res) => {
  try {
    const doc = await InventoryDefaults.findOne().sort({ updatedAt: -1 });
    if (!doc) return res.status(404).json({ message: "No inventory defaults found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: "Error fetching inventory defaults" });
  }
});

app.post("/api/inventory-defaults", async (req, res) => {
  try {
    const updated = await InventoryDefaults.findOneAndUpdate({}, req.body, {
      upsert: true,
      new: true,
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Error saving inventory defaults" });
  }
});

/* ------------------------------------ */
/* Drug Ordering & Automated Resupply   */
/* ------------------------------------ */
app.use("/api/drug-ordering-resupply", drugOrderingResupplyRoutes);

/* ------------------------------------ */
/* Start Server                         */
/* ------------------------------------ */
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Backend running on port ${PORT}`));
