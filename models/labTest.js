const mongoose = require("mongoose");

const labTestSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
  testName: { type: String, required: true },
  result: { type: String, required: true },
  unit: { type: String, default: "" },
  referenceRange: { type: String, default: "" },
  performedBy: { type: String },
  labTestCode: { type: String, required: true },
  testDate: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model("LabTest", labTestSchema);
