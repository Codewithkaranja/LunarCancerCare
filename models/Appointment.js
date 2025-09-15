const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
    required: [true, "Patient is required"]
  },
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Staff",
    required: [true, "Staff is required"]
  },
  appointmentDate: {
    type: Date,
    required: [true, "Appointment date and time are required"]
  },
  reason: {
    type: String,
    trim: true,
    default: ""
  },
  notes: {
    type: String,
    trim: true,
    default: ""
  },
  status: { 
  type: String, 
  enum: ["Pending", "Ongoing", "Completed", "Cancelled"], 
  default: "Pending" 
}

}, {
  timestamps: true // adds createdAt and updatedAt automatically
});

// Optional: virtuals to populate patient/staff names if needed
appointmentSchema.virtual("patientInfo", {
  ref: "Patient",
  localField: "patientId",
  foreignField: "_id",
  justOne: true
});

appointmentSchema.virtual("staffInfo", {
  ref: "Staff",
  localField: "staffId",
  foreignField: "_id",
  justOne: true
});

module.exports = mongoose.model("Appointment", appointmentSchema);
