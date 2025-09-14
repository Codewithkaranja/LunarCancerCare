// routes/patientRoutes.js
const express = require("express");
const router = express.Router();
const shortid = require("shortid"); // ✅ for patient codes
const Patient = require("../models/Patient");
const { authMiddleware } = require("../middleware/authMiddleware"); // ✅ destructured
const roleMiddleware = require("../middleware/roleMiddleware");
const ROLES = require("../config/roles");

// ================== GET all patients ==================
router.get(
  "/",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE, ROLES.RECEPTIONIST]),
  async (req, res) => {
    try {
      const patients = await Patient.find().sort({ createdAt: -1 });
      res.json(patients);
    } catch (err) {
      console.error("Error fetching patients:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ================== ADD new patient ==================
router.post(
  "/",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST]),
  async (req, res) => {
    const { name, age, gender, contact, address, medicalHistory } = req.body;

    if (!name || !age || !gender) {
      return res.status(400).json({ error: "Name, age, and gender are required" });
    }

    try {
      // ✅ Generate human-friendly patient code
      const patientCode = "PAT-" + shortid.generate().toUpperCase();

      const patient = new Patient({
        name,
        age,
        gender,
        contact: contact || "",
        address: address || "",
        medicalHistory: Array.isArray(medicalHistory) ? medicalHistory : [],
        patientCode, // ✅ added
      });

      const savedPatient = await patient.save();

      res.status(201).json({
        ...savedPatient.toObject(),
        patientCode: savedPatient.patientCode // ✅ include code in response
      });
    } catch (err) {
      console.error("Error adding patient:", err);
      res.status(400).json({ error: err.message });
    }
  }
);

// ================== UPDATE patient ==================
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE]),
  async (req, res) => {
    try {
      const updatedPatient = await Patient.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      if (!updatedPatient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      res.json(updatedPatient);
    } catch (err) {
      console.error("Error updating patient:", err);
      res.status(400).json({ error: err.message });
    }
  }
);

// ================== DELETE patient ==================
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN]),
  async (req, res) => {
    try {
      const deletedPatient = await Patient.findByIdAndDelete(req.params.id);
      if (!deletedPatient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      res.json({ message: "Patient deleted successfully" });
    } catch (err) {
      console.error("Error deleting patient:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
