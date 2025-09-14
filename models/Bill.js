const mongoose = require("mongoose");

const billSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    services: [{ type: String, required: true }], // e.g. Consultation, X-Ray
    amount: { type: Number, required: true },
    status: { type: String, enum: ["unpaid", "paid", "pending"], default: "unpaid" },
    issuedDate: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bill", billSchema);
