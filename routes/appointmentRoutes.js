// routes/appointmentRoutes.js
const express = require("express");
const router = express.Router();
const shortid = require("shortid"); // for human-friendly appointment codes
const Appointment = require("../models/Appointment");
const Patient = require("../models/Patient");
const { authMiddleware } = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const ROLES = require("../config/roles");

// ================== GET all appointments ==================
router.get(
  "/",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE, ROLES.RECEPTIONIST, ROLES.PHARMACIST]),
  async (req, res) => {
    try {
      const appointments = await Appointment.find()
        .populate("patientId", "name patientCode")
        .populate("staffId", "name staffCode")
        .sort({ appointmentDate: 1 });

      res.json(appointments.map(a => ({
        id: a._id,
        appointmentCode: a.appointmentCode,
        patient: a.patientId,
        staff: a.staffId,
        appointmentDate: a.appointmentDate,
        reason: a.reason,
        notes: a.notes,
        status: a.status,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })));
    } catch (err) {
      console.error("Error fetching appointments:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ================== CREATE appointment ==================
router.post(
  "/",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST]),
  async (req, res) => {
    try {
      const { patientId, staffId, appointmentDate, reason, status, notes } = req.body;

      if (!patientId || !staffId || !appointmentDate) {
        return res.status(400).json({
          error: "Patient, staff, and appointment date are required",
        });
      }

      const appointmentCode = "APT-" + shortid.generate().toUpperCase();

      const appointment = new Appointment({
        patientId,
        staffId,
        appointmentDate,
        reason: reason || "",
        notes: notes || "",
        status: status || "Pending",
        appointmentCode,
      });

      const saved = await appointment.save();

      const populated = await Appointment.findById(saved._id)
        .populate("patientId", "name patientCode")
        .populate("staffId", "name staffCode");

      res.status(201).json({
        id: populated._id,
        appointmentCode: populated.appointmentCode,
        patient: populated.patientId,
        staff: populated.staffId,
        appointmentDate: populated.appointmentDate,
        reason: populated.reason,
        notes: populated.notes,
        status: populated.status,
        createdAt: populated.createdAt,
        updatedAt: populated.updatedAt,
      });
    } catch (err) {
      console.error("Error creating appointment:", err);
      res.status(400).json({ error: err.message });
    }
  }
);

// ================== UPDATE appointment ==================
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
        .populate("patientId", "name patientCode")
        .populate("staffId", "name staffCode");

      if (!updated) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      res.json({
        id: updated._id,
        appointmentCode: updated.appointmentCode,
        patient: updated.patientId,
        staff: updated.staffId,
        appointmentDate: updated.appointmentDate,
        reason: updated.reason,
        notes: updated.notes,
        status: updated.status,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      });
    } catch (err) {
      console.error("Error updating appointment:", err);
      res.status(400).json({ error: err.message });
    }
  }
);

// ================== DELETE appointment ==================
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

      res.json({
        message: "Appointment deleted successfully",
        appointmentId: deleted._id,
      });
    } catch (err) {
      console.error("Error deleting appointment:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
