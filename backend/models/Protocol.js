// backend/models/Protocol.js
const mongoose = require("mongoose");

/**
 * The protocol JSON can contain any keys (arrays, nested objects).
 * We also track the "builtOn" field from the Dashboard (Pulse/Elosity).
 */
const ProtocolSchema = new mongoose.Schema(
  {
    protocolJson: {
      type: mongoose.Schema.Types.Mixed, // flexible nested JSON
      required: true,
    },
    builtOn: { type: String, enum: ["Pulse", "Elosity", ""], default: "" },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "protocols" }
);

module.exports = mongoose.model("Protocol", ProtocolSchema);
