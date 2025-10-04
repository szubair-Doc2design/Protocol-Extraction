// backend/server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
require("dotenv").config();

const app = express();

/* ------------------------------------ */
/* CORS CONFIG                          */
/* ------------------------------------ */
// ✅ Allow your deployed Vercel app + local dev
const allowedOrigins = [
  "https://protocol-extraction-5gcv.vercel.app", // your live frontend
  "http://localhost:3000", // local testing
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  })
);

/* ------------------------------------ */
/* MONGODB CONNECTION                   */
/* ------------------------------------ */
console.log("Loaded MONGO_URI:", process.env.MONGO_URI ? "✅ Found" : "❌ Missing");

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

/* ------------------------------------ */
/* MODELS                               */
/* ------------------------------------ */
const Protocol = require("./models/Protocol");
const RtsmInfo = require("./models/RtsmInfo");
const RolesAccess = require("./models/RolesAccess");
const InventoryDefaults = require("./models/InventoryDefaults");
const DrugOrderingResupply = require("./models/DrugOrderingResupply");

/* ------------------------------------ */
/* ROUTES                               */
/* ------------------------------------ */
const drugOrderingResupplyRoutes = require("./routes/drugOrderingResupply");

app.use(bodyParser.json());
const upload = multer({ storage: multer.memoryStorage() });

/* ------------------------------------ */
/* HEALTH CHECK                         */
/* ------------------------------------ */
app.get("/", (req, res) => {
  res.send("✅ Backend is running successfully");
});

/* ------------------------------------ */
/* JSON FILE UPLOAD                     */
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
      console.error("❌ Invalid JSON:", e);
      return res.status(400).json({ success: false, error: "Invalid JSON format" });
    }

    await Protocol.findOneAndUpdate(
      {},
      { protocolJson: parsed, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    console.log("✅ Protocol JSON uploaded successfully");
    res.json({ success: true, message: "Protocol JSON uploaded successfully" });
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ success: false, error: "Server error while uploading" });
  }
});

/* ------------------------------------ */
/* PROTOCOL APIS                        */
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
/* RTSM INFO                            */
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
/* ROLES & ACCESS                       */
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
/* INVENTORY DEFAULTS                   */
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
/* DRUG ORDERING & RESUPPLY             */
/* ------------------------------------ */
app.use("/api/drug-ordering-resupply", drugOrderingResupplyRoutes);

/* ------------------------------------ */
/* START SERVER                         */
/* ------------------------------------ */
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Backend running on port ${PORT}`));
