const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    age: { type: Number, required: true },
    gender: { 
      type: String, 
      enum: ["Male", "Female", "Rather Not Say"], 
      required: true 
    },
    email: { type: String },
    phone: { type: String },
    nationalId: { type: String },
    ailment: { type: String, required: true },
    admissionDate: { type: Date, default: Date.now },

    // 🔗 Relationships
    appointments: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" }
    ],
    bills: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Bill" }
    ],
    prescriptions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Prescription" }
    ],
    labTests: [
      { type: mongoose.Schema.Types.ObjectId, ref: "LabTest" } // ✅ added lab tests reference
    ],

    // Optional: sequential patient code
    patientCode: { type: String, unique: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Patient", patientSchema);
