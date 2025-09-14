const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // hashed password

  // 🚀 Role-based access control
  role: { 
    type: String, 
    enum: ["admin", "pharmacist", "nurse", "doctor", "staff", "viewer"], 
    default: "staff" 
  },

  department: String,
  email: String,
  phone: String,
  qualifications: String,
  hiredDate: Date,

  mustChangePassword: { type: Boolean, default: false }, // <-- enforce password reset
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ["active", "inactive"], default: "active" },

  // 🔗 Relationships
  appointments: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" }
  ]
});

module.exports = mongoose.model("Staff", staffSchema);
