const mongoose = require("mongoose");

const prescriptionSchema = new mongoose.Schema(
  {
    patientId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Patient", 
      required: true 
    }, 
    prescribedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Staff", 
      required: true 
    }, 
    items: [
      {
        name: { type: String, required: true },
        dosage: { type: String, required: true },
        duration: { type: String, required: true }, // e.g. "5 days", "2 weeks"
      },
    ],
    prescriptionCode: { 
      type: String, 
      unique: true, 
      required: true // ensure every prescription has a code
    }, 
    notes: { 
      type: String, 
      default: "" // optional doctor's notes like "Take after meals"
    },
    status: {
      type: String,
      enum: ["Pending", "Dispensed", "Cancelled"], // ✅ allowed values
      default: "Pending"
    },
    issuedDate: { 
      type: Date, 
      default: Date.now 
    },
    dispensedDate: { 
      type: Date, 
      default: null 
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Prescription", prescriptionSchema);
