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
/* ✅ Enhanced CORS handling — allows real Vercel dashboard origin         */
/* ---------------------------------------------------------------------- */
const allowedOrigins = [
  "https://protocol-extraction-5gcv-ejz66ohpk-szubairs-projects.vercel.app/",
  "http://localhost:3000"
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  console.log("🌐 Incoming request from origin:", origin || "undefined");

  if (!origin || allowedOrigins.includes(origin)) {
    res.setHeader(
      "Access-Control-Allow-Origin",
      origin || "https://protocol-extraction-5gcv-ejz66ohpk-szubairs-projects.vercel.app/"
    );
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  } else {
    console.log("❌ Origin not allowed by CORS:", origin);
    return res.status(403).json({ error: "CORS not allowed for this origin" });
  }
});

app.use(bodyParser.json());
const upload = multer({ storage: multer.memoryStorage() });

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

app.get("/", (req, res) => res.send("✅ Backend is running successfully"));

app.get("/status", async (req, res) => {
  const mongoState = mongoose.connection.readyState === 1 ? "Connected" : "Disconnected";
  res.json({
    success: true,
    mongoStatus: mongoState,
    message: "Backend and MongoDB status check"
  });
});

app.post("/api/protocol/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ success: false, error: "No file uploaded" });

    const jsonStr = req.file.buffer.toString("utf8").trim();
    if (!jsonStr)
      return res.status(400).json({ success: false, error: "Empty JSON file" });

    const parsed = JSON.parse(jsonStr);
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

app.get("/api/protocol", async (req, res) => {
  const doc = await Protocol.findOne().sort({ updatedAt: -1 }).lean();
  if (!doc) return res.status(404).json({ message: "No protocol data found" });
  res.json(doc.protocolJson);
});

app.post("/api/rtsm-info", async (req, res) => {
  const saved = await RtsmInfo.create(req.body);
  res.json({ success: true, id: saved._id });
});

app.get("/api/rtsm-info", async (req, res) => {
  const docs = await RtsmInfo.find({}).sort({ createdAt: -1 });
  res.json(docs);
});

app.get("/api/roles-access", async (req, res) => {
  const doc = await RolesAccess.findOne().sort({ updatedAt: -1 });
  if (!doc) return res.status(404).json({ message: "No roles found" });
  res.json(doc);
});

app.post("/api/roles-access", async (req, res) => {
  const { systemRoles, roleMatrix } = req.body;
  const updated = await RolesAccess.findOneAndUpdate(
    {},
    { systemRoles, roleMatrix, updatedAt: new Date() },
    { upsert: true, new: true }
  );
  res.json(updated);
});

app.get("/api/inventory-defaults", async (req, res) => {
  const doc = await InventoryDefaults.findOne().sort({ updatedAt: -1 });
  if (!doc) return res.status(404).json({ message: "No inventory found" });
  res.json(doc);
});

app.post("/api/inventory-defaults", async (req, res) => {
  const updated = await InventoryDefaults.findOneAndUpdate({}, req.body, {
    upsert: true,
    new: true,
  });
  res.json(updated);
});

app.use("/api/drug-ordering-resupply", drugOrderingResupplyRoutes);

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Backend running on port ${PORT}`));
