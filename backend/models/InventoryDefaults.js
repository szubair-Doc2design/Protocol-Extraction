const mongoose = require("mongoose");

const studyRowSchema = new mongoose.Schema({
  data: String,
  default: String,
  limit: String,
});

const siteRowSchema = new mongoose.Schema({
  data: String,
  default: String,
  limit: String,
});

const invRowSchema = new mongoose.Schema({
  data: String,
  default: String,
});

const supplyRowSchema = new mongoose.Schema({
  depotId: String,
  location: String,
  shipsCountries: String,
  shipsDepots: String,
  drugRelease: String,
  integration: String,
  address: String,
});

const returnRowSchema = new mongoose.Schema({
  depotId: String,
  location: String,
  shipsCountries: String,
  address: String,
});

const inventoryDefaultsSchema = new mongoose.Schema({
  studyRows: [studyRowSchema],
  siteRows: [siteRowSchema],
  invRows: [invRowSchema],
  supplyRows: [supplyRowSchema],
  returnRows: [returnRowSchema],
}, { timestamps: true });

module.exports = mongoose.model("InventoryDefaults", inventoryDefaultsSchema);
