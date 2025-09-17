// routes/patientRoutes.js
const express = require("express");
const router = express.Router();
const Patient = require("../models/Patient");
const { authMiddleware, requireRole } = require("../middleware/authMiddleware");
const ROLES = require("../config/roles");

// ================== Helper: Generate sequential patient code ==================
const generatePatientCode = async () => {
  const count = await Patient.countDocuments();
  return `PAT${(count + 1).toString().padStart(4, "0")}`; // PAT0001, PAT0002, etc.
};

// ================== GET all patients ==================
router.get(
  "/",
  authMiddleware,
  requireRole([ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE, ROLES.RECEPTIONIST]),
  async (req, res) => {
    try {
      const patients = await Patient.find().sort({ createdAt: -1 });
      res.json(
        patients.map((patient) => ({
          id: patient._id,
          patientCode: patient.patientCode,
          name: patient.name,
          age: patient.age,
          gender: patient.gender,
          email: patient.email || "",
          phone: patient.phone || "",
          nationalId: patient.nationalId || "",
          ailment: patient.ailment,
          admissionDate: patient.admissionDate,
          appointments: patient.appointments,
          bills: patient.bills,
          prescriptions: patient.prescriptions,
          labTests: patient.labTests,
          createdAt: patient.createdAt,
          updatedAt: patient.updatedAt,
        }))
      );
    } catch (err) {
      console.error("Error fetching patients:", err);
      res.status(500).json({ error: "Failed to fetch patients" });
    }
  }
);

// ================== ADD new patient ==================
router.post(
  "/",
  authMiddleware,
  requireRole([ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST]),
  async (req, res) => {
    try {
      const { name, age, gender, email, phone, nationalId, ailment, admissionDate } = req.body;

      if (!name || !age || !gender || !ailment) {
        return res.status(400).json({ error: "Name, age, gender, and ailment are required" });
      }

      // Ensure unique code even if two requests come at the same time
      let patientCode;
      let exists = true;
      while (exists) {
        patientCode = await generatePatientCode();
        exists = await Patient.findOne({ patientCode });
      }

      const patient = new Patient({
        name,
        age,
        gender,
        email: email || "",
        phone: phone || "",
        nationalId: nationalId || "",
        ailment,
        admissionDate: admissionDate || Date.now(),
        patientCode,
      });

      const savedPatient = await patient.save();

      res.status(201).json({
        id: savedPatient._id,
        patientCode: savedPatient.patientCode,
        name: savedPatient.name,
        age: savedPatient.age,
        gender: savedPatient.gender,
        email: savedPatient.email,
        phone: savedPatient.phone,
        nationalId: savedPatient.nationalId,
        ailment: savedPatient.ailment,
        admissionDate: savedPatient.admissionDate,
        appointments: savedPatient.appointments,
        bills: savedPatient.bills,
        prescriptions: savedPatient.prescriptions,
        labTests: savedPatient.labTests,
        createdAt: savedPatient.createdAt,
        updatedAt: savedPatient.updatedAt,
      });
    } catch (err) {
      console.error("Error adding patient:", err);
      res.status(500).json({ error: "Failed to add patient" });
    }
  }
);

// ================== UPDATE patient ==================
router.put(
  "/:id",
  authMiddleware,
  requireRole([ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE]),
  async (req, res) => {
    try {
      const updatedPatient = await Patient.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });

      if (!updatedPatient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      res.json({
        id: updatedPatient._id,
        patientCode: updatedPatient.patientCode,
        name: updatedPatient.name,
        age: updatedPatient.age,
        gender: updatedPatient.gender,
        email: updatedPatient.email,
        phone: updatedPatient.phone,
        nationalId: updatedPatient.nationalId,
        ailment: updatedPatient.ailment,
        admissionDate: updatedPatient.admissionDate,
        appointments: updatedPatient.appointments,
        bills: updatedPatient.bills,
        prescriptions: updatedPatient.prescriptions,
        labTests: updatedPatient.labTests,
        createdAt: updatedPatient.createdAt,
        updatedAt: updatedPatient.updatedAt,
      });
    } catch (err) {
      console.error("Error updating patient:", err);
      res.status(400).json({ error: "Failed to update patient" });
    }
  }
);

// ================== DELETE patient ==================
router.delete(
  "/:id",
  authMiddleware,
  requireRole([ROLES.ADMIN]),
  async (req, res) => {
    try {
      const deletedPatient = await Patient.findByIdAndDelete(req.params.id);
      if (!deletedPatient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      res.json({ message: "Patient deleted successfully", patientId: deletedPatient._id });
    } catch (err) {
      console.error("Error deleting patient:", err);
      res.status(500).json({ error: "Failed to delete patient" });
    }
  }
);

module.exports = router;
