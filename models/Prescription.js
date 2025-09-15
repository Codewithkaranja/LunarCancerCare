const mongoose = require("mongoose");

const prescriptionSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true }, // renamed for consistency
    prescribedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", required: true }, // renamed doctor -> prescribedBy
    items: [ // renamed medicines -> items
      {
        name: { type: String, required: true },
        dosage: { type: String, required: true },
        duration: { type: String, required: true }, // e.g. "5 days", "2 weeks"
      },
    ],
    prescriptionCode: { type: String, unique: true }, // sequential code like PRSC0001
    issuedDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Prescription", prescriptionSchema);
