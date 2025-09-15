require("dotenv").config(); // Load environment variables first

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// ================= Middleware =================
// Parse JSON & URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Optional: simple request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ================= MongoDB connection =================
mongoose.set("strictQuery", true);

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    // Optional: backfill missing Medicine fields
    const Medicine = require("./models/Medicine");
    const medicines = await Medicine.find({});
    let count = 0;
    for (let med of medicines) {
      let changed = false;
      if (med.batch === undefined) {
        med.batch = "";
        changed = true;
      }
      if (med.price === undefined) {
        med.price = 0;
        changed = true;
      }
      if (changed) {
        await med.save();
        count++;
      }
    }
    if (count > 0) console.log(`🛠️ Backfilled ${count} medicine records`);
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
}
connectDB();

// ================= Routes =================
const authRoutes = require("./routes/authRoutes");
const patientRoutes = require("./routes/patientRoutes");
const staffRoutes = require("./routes/staffRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const medicineRoutes = require("./routes/medicineRoutes");
const billRoutes = require("./routes/billRoutes");
const prescriptionRoutes = require("./routes/prescriptionRoutes");
const labTestRoutes = require("./routes/labTestRoutes"); // Fixed: proper route file

// ================= Mount routes =================
app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/lab-tests", labTestRoutes); // Correctly mounted

// ================= Default route =================
app.get("/", (req, res) => {
  res.send("Hospital Management Information System API is running 🚑");
});

// ================= Error handling =================
// Catch all 404
app.use((req, res, next) => {
  res.status(404).json({ error: "Route not found" });
});

// Catch all other errors
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err);
  res.status(500).json({ error: err.message });
});

// ================= Start server =================
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
