const express = require("express");
const router = express.Router();
const Appointment = require("../models/Appointment");
const Patient = require("../models/Patient");
const { authMiddleware } = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const ROLES = require("../config/roles");

// ================== HELPER: generate sequential appointment code ==================
const generateAppointmentCode = async () => {
  const count = await Appointment.countDocuments();
  return `APT${(count + 1).toString().padStart(4, "0")}`;
};

// ================== TEST ROUTE ==================
router.get("/test", (req, res) => {
  res.json({ message: "Appointment route is working!" });
});

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

      res.json(
        appointments.map((a) => ({
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
        }))
      );
    } catch (err) {
      console.error("Error fetching appointments:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ================== GET single appointment by ID ==================
router.get(
  "/:id",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE, ROLES.RECEPTIONIST, ROLES.PHARMACIST]),
  async (req, res) => {
    try {
      const appointment = await Appointment.findById(req.params.id)
        .populate("patientId", "name patientCode")
        .populate("staffId", "name staffCode");

      if (!appointment) return res.status(404).json({ error: "Appointment not found" });

      res.json({
        id: appointment._id,
        appointmentCode: appointment.appointmentCode,
        patient: appointment.patientId,
        staff: appointment.staffId,
        appointmentDate: appointment.appointmentDate,
        reason: appointment.reason,
        notes: appointment.notes,
        status: appointment.status,
        createdAt: appointment.createdAt,
        updatedAt: appointment.updatedAt,
      });
    } catch (err) {
      console.error("Error fetching appointment:", err);
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

      // 🔒 Enforce patient, staff, and date
      if (!patientId || !staffId || !appointmentDate) {
        return res.status(400).json({
          error: "Patient, staff, and appointment date are required",
        });
      }

      // Ensure patient exists
      const patient = await Patient.findById(patientId);
      if (!patient) return res.status(404).json({ error: "Patient not found" });

      // Generate appointment code
      const appointmentCode = await generateAppointmentCode();

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

      // 🔗 Link appointment to patient's appointments array
      patient.appointments = patient.appointments || [];
      patient.appointments.push(saved._id);
      await patient.save();

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
      res.status(400).json({ error: err.message, details: err.stack });
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
      const { patientId } = req.body;

      // 🔒 Prevent removing patient
      if (!patientId) {
        return res.status(400).json({ error: "Patient cannot be removed from an appointment" });
      }

      // Ensure patient exists
      const patient = await Patient.findById(patientId);
      if (!patient) return res.status(404).json({ error: "Patient not found" });

      const updated = await Appointment.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      })
        .populate("patientId", "name patientCode")
        .populate("staffId", "name staffCode");

      if (!updated) return res.status(404).json({ error: "Appointment not found" });

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
      res.status(400).json({ error: err.message, details: err.stack });
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
      if (!deleted) return res.status(404).json({ error: "Appointment not found" });

      // 🔗 Remove appointment from patient's appointments array
      const patient = await Patient.findById(deleted.patientId);
      if (patient) {
        patient.appointments = patient.appointments.filter(
          (id) => id.toString() !== deleted._id.toString()
        );
        await patient.save();
      }

      res.json({
        message: "Appointment deleted successfully",
        appointmentId: deleted._id,
      });
    } catch (err) {
      console.error("Error deleting appointment:", err);
      res.status(500).json({ error: err.message, details: err.stack });
    }
  }
);

module.exports = router;
