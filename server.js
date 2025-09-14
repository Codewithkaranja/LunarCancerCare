require("dotenv").config(); // Load environment variables first

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// ================= Middleware =================
app.use(express.json());
app.use(cors());

// ================= MongoDB connection =================
mongoose.set("strictQuery", true);

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    // Optional: run backfill after connection
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
    process.exit(1); // Force exit if DB fails (Render will restart)
  }
}
connectDB();

// ================= Routes =================
const authRoutes = require("./routes/authRoutes");
const patientRoutes = require("./routes/patientRoutes");
const staffRoutes = require("./routes/staffRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const medicineRoutes = require("./routes/medicineRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/medicines", medicineRoutes);

// ================= Default route =================
app.get("/", (req, res) => {
  res.send("Hospital Management Information System API is running 🚑");
});

// ================= Start server =================
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
