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
app.use(cors());
app.use(bodyParser.json());

// ✅ MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

const upload = multer({ storage: multer.memoryStorage() });

/* ------------------------------------ */
/* Health Check                         */
/* ------------------------------------ */
app.get("/", (req, res) => {
  res.send("✅ Backend is running successfully");
});

/* ------------------------------------ */
/* MongoDB Status Check (New Route)     */
/* ------------------------------------ */
app.get("/status", async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const states = ["Disconnected", "Connected", "Connecting", "Disconnecting"];
    res.json({
      success: true,
      mongoStatus: states[dbState],
      message: "Backend and MongoDB status check",
    });
  } catch (err) {
    console.error("❌ Status check error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ------------------------------------ */
/* Direct JSON upload (for testing)     */
/* ------------------------------------ */
app.post("/upload", async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ success: false, message: "Empty JSON body" });
    }

    await Protocol.findOneAndUpdate(
      {},
      { protocolJson: req.body, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: "JSON uploaded successfully" });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(400).json({ success: false, message: "Invalid JSON data" });
  }
});

/* ------------------------------------ */
/* File Upload Endpoint (Frontend uses this) */
/* ------------------------------------ */
app.post("/api/protocol/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    const jsonStr = req.file.buffer.toString("utf8").trim();
    if (!jsonStr) {
      return res.status(400).json({ success: false, error: "Empty JSON file" });
    }

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

    console.log("✅ JSON uploaded successfully:", parsed);
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
    console.error(err);
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
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/protocol/builtOn", async (req, res) => {
  try {
    const { builtOn } = req.body;
    await Protocol.findOneAndUpdate({}, { builtOn, updatedAt: new Date() }, { upsert: true });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
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
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/rtsm-info", async (req, res) => {
  try {
    const { protocolNumber } = req.query;
    const filter = protocolNumber ? { protocolNumber } : {};
    const docs = await RtsmInfo.find(filter).sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching RTSM info", error: err });
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
    console.error(err);
    res.status(500).json({ message: "Error fetching roles and access data", error: err });
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
    console.error(err);
    res.status(500).json({ message: "Error saving roles and access data", error: err });
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
    console.error(err);
    res.status(500).json({ message: "Error fetching inventory defaults", error: err });
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
    console.error(err);
    res.status(500).json({ message: "Error saving inventory defaults", error: err });
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
