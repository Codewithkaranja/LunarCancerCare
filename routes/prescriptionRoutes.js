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
  const lastPrescription = await Prescription.findOne().sort({ createdAt: -1 });
  if (!lastPrescription) return "PRSC0001";

  const lastNum = parseInt(lastPrescription.prescriptionCode.replace("PRSC", ""), 10);
  return `PRSC${(lastNum + 1).toString().padStart(4, "0")}`;
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
        .populate("prescribedBy", "name staffCode role")
        .sort({ createdAt: -1 });

      res.json(
        prescriptions.map((p) => ({
          id: p._id,
          prescriptionCode: p.prescriptionCode,
          patient: p.patientId,
          prescribedBy: p.prescribedBy,
          items: p.items,
          notes: p.notes || "",
          status: p.status,
          issuedDate: p.issuedDate,
          dispensedDate: p.dispensedDate || null,
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

// ================== GET single prescription ==================
router.get(
  "/:id",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE, ROLES.PHARMACIST]),
  async (req, res) => {
    try {
      const prescription = await Prescription.findById(req.params.id)
        .populate("patientId", "name patientCode")
        .populate("prescribedBy", "name staffCode role");

      if (!prescription) return res.status(404).json({ error: "Prescription not found" });

      res.json({
        id: prescription._id,
        prescriptionCode: prescription.prescriptionCode,
        patient: prescription.patientId,
        prescribedBy: prescription.prescribedBy,
        items: prescription.items,
        notes: prescription.notes || "",
        status: prescription.status,
        issuedDate: prescription.issuedDate,
        dispensedDate: prescription.dispensedDate || null,
        createdAt: prescription.createdAt,
        updatedAt: prescription.updatedAt,
      });
    } catch (err) {
      console.error("Error fetching prescription:", err);
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
      const { patientId, items, notes } = req.body;

      if (!patientId || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Patient and prescription items are required" });
      }

      const patient = await Patient.findById(patientId);
      if (!patient) return res.status(404).json({ error: "Patient not found" });

      const prescriptionCode = await generatePrescriptionCode();

      const prescription = new Prescription({
        patientId,
        prescribedBy: req.user.id,
        items,
        notes: notes || "",
        prescriptionCode,
        status: "Pending", // ✅ default
      });

      const saved = await prescription.save();

      // Link prescription to patient
      patient.prescriptions = patient.prescriptions || [];
      patient.prescriptions.push(saved._id);
      await patient.save();

      const populated = await Prescription.findById(saved._id)
        .populate("patientId", "name patientCode")
        .populate("prescribedBy", "name staffCode role");

      res.status(201).json({
        id: populated._id,
        prescriptionCode: populated.prescriptionCode,
        patient: populated.patientId,
        prescribedBy: populated.prescribedBy,
        items: populated.items,
        notes: populated.notes || "",
        status: populated.status,
        issuedDate: populated.issuedDate,
        dispensedDate: populated.dispensedDate || null,
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
      const { items, notes, status } = req.body;

      const updateData = { items, notes, status };
      if (status === "Dispensed") updateData.dispensedDate = new Date();

      const updated = await Prescription.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true,
      })
        .populate("patientId", "name patientCode")
        .populate("prescribedBy", "name staffCode role");

      if (!updated) return res.status(404).json({ error: "Prescription not found" });

      res.json({
        id: updated._id,
        prescriptionCode: updated.prescriptionCode,
        patient: updated.patientId,
        prescribedBy: updated.prescribedBy,
        items: updated.items,
        notes: updated.notes || "",
        status: updated.status,
        issuedDate: updated.issuedDate,
        dispensedDate: updated.dispensedDate || null,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      });
    } catch (err) {
      console.error("Error updating prescription:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ================== DISPENSE prescription (Pharmacist/Admin) ==================
router.put(
  "/:id/dispense",
  authMiddleware,
  roleMiddleware([ROLES.PHARMACIST, ROLES.ADMIN]),
  async (req, res) => {
    try {
      const updated = await Prescription.findByIdAndUpdate(
        req.params.id,
        { status: "Dispensed", dispensedDate: new Date() },
        { new: true }
      )
        .populate("patientId", "name patientCode")
        .populate("prescribedBy", "name staffCode role");

      if (!updated) return res.status(404).json({ error: "Prescription not found" });

      res.json({
        message: "Prescription dispensed successfully",
        prescription: {
          id: updated._id,
          prescriptionCode: updated.prescriptionCode,
          status: updated.status,
          dispensedDate: updated.dispensedDate,
        },
      });
    } catch (err) {
      console.error("Error dispensing prescription:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ================== CANCEL prescription (Admin/Doctor) ==================
router.put(
  "/:id/cancel",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.DOCTOR]),
  async (req, res) => {
    try {
      const updated = await Prescription.findByIdAndUpdate(
        req.params.id,
        { status: "Cancelled" },
        { new: true }
      )
        .populate("patientId", "name patientCode")
        .populate("prescribedBy", "name staffCode role");

      if (!updated) return res.status(404).json({ error: "Prescription not found" });

      res.json({
        message: "Prescription cancelled successfully",
        prescription: {
          id: updated._id,
          prescriptionCode: updated.prescriptionCode,
          status: updated.status,
        },
      });
    } catch (err) {
      console.error("Error cancelling prescription:", err);
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
      const deleted = await Prescription.findByIdAndDelete(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Prescription not found" });

      await Patient.findByIdAndUpdate(deleted.patientId, {
        $pull: { prescriptions: deleted._id },
      });

      res.json({
        message: "Prescription deleted successfully",
        prescriptionId: deleted._id,
      });
    } catch (err) {
      console.error("Error deleting prescription:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

module.exports = router;
