// routes/appointmentRoutes.js
const express = require("express");
const router = express.Router();
const shortid = require("shortid"); // ✅ for appointment codes
const Appointment = require("../models/Appointment");
const { authMiddleware } = require("../middleware/authMiddleware"); // ✅ destructured
const roleMiddleware = require("../middleware/roleMiddleware");
const ROLES = require("../config/roles");

// ================== GET all appointments ==================
// Allowed: Admin, Doctor, Nurse, Receptionist, Pharmacist
router.get(
  "/",
  authMiddleware,
  roleMiddleware([
    ROLES.ADMIN,
    ROLES.DOCTOR,
    ROLES.NURSE,
    ROLES.RECEPTIONIST,
    ROLES.PHARMACIST,
  ]),
  async (req, res) => {
    try {
      const appointments = await Appointment.find()
        .populate("patientId", "name patientCode") // ✅ include patientCode
        .populate("staffId", "name staffCode")     // ✅ include staffCode
        .sort({ appointmentDate: 1 });

      res.json(appointments);
    } catch (err) {
      console.error("Error fetching appointments:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ================== CREATE appointment ==================
// Allowed: Admin, Doctor, Receptionist
router.post(
  "/",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST]),
  async (req, res) => {
    const { patientId, staffId, appointmentDate, reason, status, notes } = req.body;

    if (!patientId || !staffId || !appointmentDate) {
      return res.status(400).json({
        error: "Patient, staff, and appointment date are required",
      });
    }

    try {
      // ✅ Generate human-friendly appointment code
      const appointmentCode = "APT-" + shortid.generate().toUpperCase();

      const newAppointment = new Appointment({
        patientId,
        staffId,
        appointmentDate,
        reason: reason || "",
        notes: notes || "",
        status: status || "Pending",
        appointmentCode, // ✅ added
      });

      const saved = await newAppointment.save();

      const populated = await Appointment.findById(saved._id)
        .populate("patientId", "name patientCode") // ✅ include patientCode
        .populate("staffId", "name staffCode");   // ✅ include staffCode

      res.status(201).json(populated);
    } catch (err) {
      console.error("Error creating appointment:", err);
      res.status(400).json({ error: err.message });
    }
  }
);

// ================== UPDATE appointment ==================
// Allowed: Admin, Doctor, Receptionist
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST]),
  async (req, res) => {
    try {
      const updated = await Appointment.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      )
        .populate("patientId", "name patientCode") // ✅ include patientCode
        .populate("staffId", "name staffCode");   // ✅ include staffCode

      if (!updated) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      res.json(updated);
    } catch (err) {
      console.error("Error updating appointment:", err);
      res.status(400).json({ error: err.message });
    }
  }
);

// ================== DELETE appointment ==================
// Allowed: Admin only
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN]),
  async (req, res) => {
    try {
      const deleted = await Appointment.findByIdAndDelete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      res.json({ message: "Appointment deleted successfully" });
    } catch (err) {
      console.error("Error deleting appointment:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
