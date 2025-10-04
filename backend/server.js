// backend/server.js
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const multer = require("multer");
require("dotenv").config();

console.log("Loaded MONGO_URI:", process.env.MONGO_URI ? "✅ Found" : "❌ Missing");

// Models
const Protocol = require("./models/Protocol");
const RtsmInfo = require("./models/RtsmInfo");
const RolesAccess = require("./models/RolesAccess");
const InventoryDefaults = require("./models/InventoryDefaults");
const drugOrderingResupplyRoutes = require("./routes/drugOrderingResupply");

const app = express();

/* ---------------------------------------------------------------------- */
/* ✅ MANUAL CORS HANDLING + DEBUG LOGGING                                 */
/* ---------------------------------------------------------------------- */
const allowedOrigins = [
  "https://protocol-extraction-5gcv.vercel.app", // your frontend on Vercel
  "http://localhost:3000" // local development
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  console.log("🌐 Incoming request from origin:", origin || "No origin header");

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    console.warn("⚠️  Origin not allowed by CORS:", origin);
    res.setHeader("Access-Control-Allow-Origin", "https://protocol-extraction-5gcv.vercel.app");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Handle preflight OPTIONS requests
  if (req.method === "OPTIONS") {
    console.log("🟢 Preflight request handled");
    return res.status(204).end();
  }

  next();
});

app.use(bodyParser.json());
const upload = multer({ storage: multer.memoryStorage() });

/* ---------------------------------------------------------------------- */
/* ✅ MongoDB Connection                                                   */
/* ---------------------------------------------------------------------- */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

/* ---------------------------------------------------------------------- */
/* Health Check                                                           */
/* ---------------------------------------------------------------------- */
app.get("/", (req, res) => {
  res.send("✅ Backend is running successfully");
});

/* Quick Status Check */
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

/* ---------------------------------------------------------------------- */
/* File Upload Endpoint                                                   */
/* ---------------------------------------------------------------------- */
app.post("/api/protocol/upload", upload.single("file"), async (req, res) => {
  try {
    console.log("📦 File upload request received");

    if (!req.file)
      return res.status(400).json({ success: false, error: "No file uploaded" });

    const jsonStr = req.file.buffer.toString("utf8").trim();
    if (!jsonStr)
      return res.status(400).json({ success: false, error: "Empty JSON file" });

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error("❌ Invalid JSON format:", e.message);
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

/* ---------------------------------------------------------------------- */
/* Dashboard Protocol APIs                                                */
/* ---------------------------------------------------------------------- */
app.get("/api/protocol", async (req, res) => {
  try {
    const doc = await Protocol.findOne().sort({ updatedAt: -1 }).lean();
    if (!doc) return res.status(404).json({ message: "No protocol data found" });
    res.json(doc.protocolJson);
  } catch (err) {
    console.error("❌ Error reading protocol data:", err);
    res.status(500).json({ message: "Error reading protocol data" });
  }
});

/* ---------------------------------------------------------------------- */
/* RTSM Info Endpoints                                                    */
/* ---------------------------------------------------------------------- */
app.post("/api/rtsm-info", async (req, res) => {
  try {
    const saved = await RtsmInfo.create(req.body);
    res.json({ success: true, id: saved._id });
  } catch (err) {
    console.error("❌ RTSM Save Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/rtsm-info", async (req, res) => {
  try {
    const docs = await RtsmInfo.find({}).sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) {
    console.error("❌ RTSM Fetch Error:", err);
    res.status(500).json({ message: "Error fetching RTSM info" });
  }
});

/* ---------------------------------------------------------------------- */
/* Roles, Inventory, Drug Ordering                                        */
/* ---------------------------------------------------------------------- */
app.get("/api/roles-access", async (req, res) => {
  try {
    const doc = await RolesAccess.findOne().sort({ updatedAt: -1 });
    if (!doc) return res.status(404).json({ message: "No roles found" });
    res.json(doc);
  } catch (err) {
    console.error("❌ Roles fetch error:", err);
    res.status(500).json({ message: "Error fetching roles" });
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
    console.error("❌ Roles save error:", err);
    res.status(500).json({ message: "Error saving roles" });
  }
});

app.get("/api/inventory-defaults", async (req, res) => {
  try {
    const doc = await InventoryDefaults.findOne().sort({ updatedAt: -1 });
    if (!doc) return res.status(404).json({ message: "No inventory found" });
    res.json(doc);
  } catch (err) {
    console.error("❌ Inventory fetch error:", err);
    res.status(500).json({ message: "Error fetching inventory" });
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
    console.error("❌ Inventory save error:", err);
    res.status(500).json({ message: "Error saving inventory" });
  }
});

app.use("/api/drug-ordering-resupply", drugOrderingResupplyRoutes);

/* ---------------------------------------------------------------------- */
/* Start Server                                                           */
/* ---------------------------------------------------------------------- */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Backend running on port ${PORT}`));
