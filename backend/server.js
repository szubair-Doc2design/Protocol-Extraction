// backend/server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");

const Protocol = require("./models/Protocol");
const RtsmInfo = require("./models/RtsmInfo");
const RolesAccess = require("./models/RolesAccess");
const InventoryDefaults = require("./models/InventoryDefaults");
const DrugOrderingResupply = require("./models/DrugOrderingResupply");

const drugOrderingResupplyRoutes = require("./routes/drugOrderingResupply");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/protocolDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.connection.on("connected", () => console.log("✅ MongoDB connected"));
mongoose.connection.on("error", (err) => console.error("MongoDB connection error:", err));

const upload = multer({ storage: multer.memoryStorage() });

/* ------------------------------------ */
/* JSON Upload (Direct)                 */
/* ------------------------------------ */
app.post("/upload", async (req, res) => {
  try {
    console.log("Received JSON via /upload:", req.body);

    await Protocol.findOneAndUpdate(
      {},
      { protocolJson: req.body, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: "JSON uploaded successfully", data: req.body });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(400).json({ success: false, message: "Invalid JSON data" });
  }
});

/* ------------------------------------ */
/* Dashboard Protocol Endpoints          */
/* ------------------------------------ */
app.post("/api/protocol/upload", upload.single("file"), async (req, res) => {
  try {
    const jsonStr = req.file.buffer.toString("utf8");
    const parsed = JSON.parse(jsonStr);

    await Protocol.findOneAndUpdate(
      {},
      { protocolJson: parsed, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: "Protocol JSON uploaded successfully" });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(400).json({ success: false, message: "Invalid JSON file" });
  }
});

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
    const updated = await InventoryDefaults.findOneAndUpdate({}, req.body, { upsert: true, new: true });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error saving inventory defaults", error: err });
  }
});

/* ------------------------------------ */
/* Drug Ordering & Automated Resupply  */
/* ------------------------------------ */
app.use("/api/drug-ordering-resupply", drugOrderingResupplyRoutes);

/* ------------------------------------ */
/* Start server                        */
/* ------------------------------------ */
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Backend running on port ${PORT}`));
