const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const Patient = require("./models/Patient");
const Staff = require("./models/Staff");
const Appointment = require("./models/Appointment");

const app = express();
app.use(express.json());

// -------------------- Patient Routes --------------------
app.post("/patients", async (req, res) => {
  try {
    const patient = new Patient(req.body);
    await patient.save();
    res.status(201).json(patient);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/patients", async (req, res) => {
  try {
    const patients = await Patient.find();
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------- Staff Routes --------------------
app.post("/staff", async (req, res) => {
  try {
    const staff = new Staff(req.body);
    await staff.save();
    res.status(201).json(staff);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/staff", async (req, res) => {
  try {
    const staffList = await Staff.find();
    res.json(staffList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------- Appointment Routes --------------------
app.post("/appointments", async (req, res) => {
  try {
    const appointment = new Appointment(req.body);
    await appointment.save();
    const populated = await appointment.populate("patient staff");
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/appointments", async (req, res) => {
  try {
    const appointments = await Appointment.find().populate("patient staff");
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------- MongoDB Connection --------------------
mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/hmis3", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.listen(5000, () => console.log("🚀 Server running on port 5000\n✅ MongoDB connected..."));
