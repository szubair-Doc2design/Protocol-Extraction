// backend/server.js
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const multer = require("multer");
require("dotenv").config();

console.log("Loaded MONGO_URI:", process.env.MONGO_URI ? "✅ Found" : "❌ Missing");

const Protocol = require("./models/Protocol");
const RtsmInfo = require("./models/RtsmInfo");
const RolesAccess = require("./models/RolesAccess");
const InventoryDefaults = require("./models/InventoryDefaults");
const drugOrderingResupplyRoutes = require("./routes/drugOrderingResupply");

const app = express();

/* ---------------------------------------------------------------------- */
/* ✅ MANUAL CORS HANDLING (works even if middleware fails)                */
/* ---------------------------------------------------------------------- */
const allowedOrigins = [
  "https://protocol-extraction-5gcv.vercel.app", // your Vercel frontend
  "http://localhost:3000" // for local testing
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "https://protocol-extraction-5gcv.vercel.app");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Handle preflight (OPTIONS) request
  if (req.method === "OPTIONS") {
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

/* ---------------------------------------------------------------------- */
/* File Upload                                                            */
/* ---------------------------------------------------------------------- */
app.post("/api/protocol/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ success: false, error: "No file uploaded" });

    const jsonStr = req.file.buffer.toString("utf8").trim();
    if (!jsonStr)
      return res.status(400).json({ success: false, error: "Empty JSON file" });

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error("❌ Invalid JSON:", e);
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
    console.error(err);
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

/* ---------------------------------------------------------------------- */
/* Roles, Inventory, Drug Ordering                                        */
/* ---------------------------------------------------------------------- */
app.get("/api/roles-access", async (req, res) => {
  try {
    const doc = await RolesAccess.findOne().sort({ updatedAt: -1 });
    if (!doc) return res.status(404).json({ message: "No roles found" });
    res.json(doc);
  } catch (err) {
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
    res.status(500).json({ message: "Error saving roles" });
  }
});

app.get("/api/inventory-defaults", async (req, res) => {
  try {
    const doc = await InventoryDefaults.findOne().sort({ updatedAt: -1 });
    if (!doc) return res.status(404).json({ message: "No inventory found" });
    res.json(doc);
  } catch (err) {
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
    res.status(500).json({ message: "Error saving inventory" });
  }
});

app.use("/api/drug-ordering-resupply", drugOrderingResupplyRoutes);

/* ---------------------------------------------------------------------- */
/* Start Server                                                           */
/* ---------------------------------------------------------------------- */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Backend running on port ${PORT}`));
