// routes/prescriptionRoutes.js
const express = require("express");
const router = express.Router();
const Prescription = require("../models/Prescription");
const Patient = require("../models/Patient");
const { authMiddleware } = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const ROLES = require("../config/roles");

// ================== Helper: Generate sequential prescription code ==================
const generatePrescriptionCode = async () => {
  const count = await Prescription.countDocuments();
  return `PRSC${(count + 1).toString().padStart(4, "0")}`; // PRSC0001, PRSC0002, etc.
};

// ================== GET all prescriptions ==================
router.get(
  "/",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE, ROLES.PHARMACIST]),
  async (req, res) => {
    try {
      const prescriptions = await Prescription.find()
        .populate("patientId", "name patientCode")
        .populate("prescribedBy", "name staffCode")
        .sort({ createdAt: -1 });

      res.json(
        prescriptions.map((p) => ({
          id: p._id,
          prescriptionCode: p.prescriptionCode,
          patient: p.patientId,
          prescribedBy: p.prescribedBy,
          items: p.items,
          notes: p.notes || "",
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        }))
      );
    } catch (err) {
      console.error("Error fetching prescriptions:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ================== ADD new prescription ==================
router.post(
  "/",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.DOCTOR]),
  async (req, res) => {
    try {
      const { patientId, prescribedBy, items, notes } = req.body;

      // Validate required fields
      if (!patientId || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Patient and prescription items are required" });
      }

      const patient = await Patient.findById(patientId);
      if (!patient) return res.status(404).json({ error: "Patient not found" });

      const prescriptionCode = await generatePrescriptionCode();

      const prescription = new Prescription({
        patientId,
        prescribedBy: prescribedBy || req.user?.name || "Unknown",
        items,
        notes: notes || "",
        prescriptionCode,
      });

      const savedPrescription = await prescription.save();

      // Add prescription ID to patient's prescriptions array
      patient.prescriptions = patient.prescriptions || [];
      patient.prescriptions.push(savedPrescription._id);
      await patient.save();

      const populated = await Prescription.findById(savedPrescription._id)
        .populate("patientId", "name patientCode")
        .populate("prescribedBy", "name staffCode");

      res.status(201).json({
        id: populated._id,
        prescriptionCode: populated.prescriptionCode,
        patient: populated.patientId,
        prescribedBy: populated.prescribedBy,
        items: populated.items,
        notes: populated.notes || "",
        createdAt: populated.createdAt,
        updatedAt: populated.updatedAt,
      });
    } catch (err) {
      console.error("Error adding prescription:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ================== UPDATE prescription ==================
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.DOCTOR]),
  async (req, res) => {
    try {
      const { items, notes } = req.body;

      const updatedPrescription = await Prescription.findByIdAndUpdate(
        req.params.id,
        { items, notes },
        { new: true, runValidators: true }
      )
        .populate("patientId", "name patientCode")
        .populate("prescribedBy", "name staffCode");

      if (!updatedPrescription) return res.status(404).json({ error: "Prescription not found" });

      res.json({
        id: updatedPrescription._id,
        prescriptionCode: updatedPrescription.prescriptionCode,
        patient: updatedPrescription.patientId,
        prescribedBy: updatedPrescription.prescribedBy,
        items: updatedPrescription.items,
        notes: updatedPrescription.notes || "",
        createdAt: updatedPrescription.createdAt,
        updatedAt: updatedPrescription.updatedAt,
      });
    } catch (err) {
      console.error("Error updating prescription:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ================== DELETE prescription ==================
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN]),
  async (req, res) => {
    try {
      const deletedPrescription = await Prescription.findByIdAndDelete(req.params.id);
      if (!deletedPrescription) return res.status(404).json({ error: "Prescription not found" });

      // Remove prescription ID from patient's prescriptions array
      await Patient.findByIdAndUpdate(deletedPrescription.patientId, {
        $pull: { prescriptions: deletedPrescription._id },
      });

      res.json({ message: "Prescription deleted successfully", prescriptionId: deletedPrescription._id });
    } catch (err) {
      console.error("Error deleting prescription:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

module.exports = router;
