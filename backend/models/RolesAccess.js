const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema({
  roleType: { type: String, required: true, trim: true },
  permissionLevel: { type: String, required: true, trim: true },
  blindedStatus: { type: String, enum: ["Blinded", "Unblinded"], default: "Unblinded" },
  prmRole: { type: String, trim: true, default: "" },
});

const roleMatrixSchema = new mongoose.Schema({
  addingUser: { type: String, required: true, trim: true },
  allowedRoles: [{ type: String, trim: true }],
});

const rolesAccessSchema = new mongoose.Schema(
  {
    systemRoles: { type: [roleSchema], default: [] },
    roleMatrix: { type: [roleMatrixSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RolesAccess", rolesAccessSchema);
