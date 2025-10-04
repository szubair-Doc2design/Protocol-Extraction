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

/* -------------------------------------------------------------------------- */
/* ✅ 1. UNIVERSAL CORS FIX                                                   */
/* -------------------------------------------------------------------------- */
app.use((req, res, next) => {
  const allowedOrigins = [
    "https://protocol-extraction-5gcv.vercel.app",
    "http://localhost:3000",
  ];
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.use(express.json());
app.use(bodyParser.json());
const upload = multer({ storage: multer.memoryStorage() });

/* -------------------------------------------------------------------------- */
/* ✅ 2. MongoDB Connection                                                   */
/* -------------------------------------------------------------------------- */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

/* -------------------------------------------------------------------------- */
/* ✅ 3. Health & Debug Routes                                                */
/* -------------------------------------------------------------------------- */
app.get("/", (req, res) => {
  res.send("✅ Backend running and CORS configured correctly");
});

app.get("/status", async (req, res) => {
  const mongoState = mongoose.connection.readyState === 1 ? "Connected" : "Disconnected";
  res.json({ success: true, mongoStatus: mongoState });
});

/* -------------------------------------------------------------------------- */
/* ✅ 4. File Upload (Main JSON Upload Endpoint)                              */
/* -------------------------------------------------------------------------- */
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

/* -------------------------------------------------------------------------- */
/* ✅ 5. Additional API Routes (unchanged)                                    */
/* -------------------------------------------------------------------------- */
app.get("/api/protocol", async (req, res) => {
  try {
    const doc = await Protocol.findOne().sort({ updatedAt: -1 }).lean();
    if (!doc) return res.status(404).json({ message: "No protocol data found" });
    res.json(doc.protocolJson);
  } catch (err) {
    res.status(500).json({ message: "Error reading protocol data" });
  }
});

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

app.use("/api/drug-ordering-resupply", drugOrderingResupplyRoutes);

/* -------------------------------------------------------------------------- */
/* ✅ 6. Server Startup                                                      */
/* -------------------------------------------------------------------------- */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Backend running on port ${PORT}`));
