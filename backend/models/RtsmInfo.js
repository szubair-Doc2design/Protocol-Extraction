// backend/models/RtsmInfo.js
const mongoose = require("mongoose");

const Mixed = mongoose.Schema.Types.Mixed;

// We simply accept any nested JSON so front-end can evolve without schema edits.
const RtsmInfoSchema = new mongoose.Schema(
  {
    protocolNumber: { type: String, required: true },
    protocolDescription: { type: String, required: true },
    // Entire React form object
    formData: {
      type: Mixed,
      default: {},
    },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "rtsmInfos" }
);

module.exports = mongoose.model("RtsmInfo", RtsmInfoSchema);
