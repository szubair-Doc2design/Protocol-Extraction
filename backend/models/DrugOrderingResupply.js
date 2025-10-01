const mongoose = require("mongoose");

const predictiveRuleSchema = new mongoose.Schema({
  schedule: String,
  visitType: String,
  projections: String,
});

const drugOrderingResupplySchema = new mongoose.Schema({
  shipmentNumberText: String,

  shipmentTypes: {
    initial: Boolean,
    threshold: Boolean,
    predictive: Boolean,
    bundling: Boolean,
    manual: Boolean,
  },

  defaultInitialTrigger: String, // Enum could be validated if needed
  thresholdResupply: String,
  predictiveTrigger: String,

  defaultSupplyStrategy: String,

  bundlingAllowed: {
    initial: Boolean,
    threshold: Boolean,
    predictive: Boolean,
    manual: Boolean,
  },

  shipmentBundlingText: String,

  partialShipments: {
    initial: Boolean,
    threshold: Boolean,
    predictive: Boolean,
    bundled: Boolean,
  },

  specialConditions: {
    allowOneKit: Boolean,
    ruleA: Boolean,
    ruleB: Boolean,
  },

  predictiveRules: [predictiveRuleSchema],

  manualLotsToDisplay: String,

  supplyCouriers: {
    fedex: Boolean,
    ups: Boolean,
    dhl: Boolean,
    usps: Boolean,
    world: Boolean,
    tnt: Boolean,
    speed: Boolean,
    marken: Boolean,
    other: Boolean,
    otherText: String,
  },

  returnCouriers: {
    fedex: Boolean,
    ups: Boolean,
    dhl: Boolean,
    usps: Boolean,
    world: Boolean,
    tnt: Boolean,
    speed: Boolean,
    marken: Boolean,
    other: Boolean,
    otherText: String,
  },

  largeShipmentQty: String,
  largeShipmentNote: String,

  unackShipmentAlert: String,
  unackReturnAlert: String,

  expiryAlertSite: String,
  expiryAlertDepot: String,

  kitStatusInExpiry: {
    available: Boolean,
    dnd: Boolean,
    dns: Boolean,
    qTransit: Boolean,
    qOnSite: Boolean,
  },

  siteInventoryAlert: String,
  depotInventoryAlert: String,
  depotAlertFootnote: String,
}, { timestamps: true });

module.exports = mongoose.model("DrugOrderingResupply", drugOrderingResupplySchema);
