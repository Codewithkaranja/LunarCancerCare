const express = require("express");
const router = express.Router();
const LabTest = require("../models/labTest");
const Patient = require("../models/Patient");
const { authMiddleware } = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const ROLES = require("../config/roles");

// Helper to generate sequential lab test code
const generateLabTestCode = async () => {
  const count = await LabTest.countDocuments();
  return `LAB${(count + 1).toString().padStart(4, "0")}`;
};

// POST /api/lab-tests
router.post(
  "/",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE, ROLES.PHARMACIST]),
  async (req, res) => {
    try {
      const { patientId, testName, result, unit, referenceRange, performedBy } = req.body;

      if (!patientId || !testName || !result) {
        return res.status(400).json({ error: "patientId, testName, and result are required" });
      }

      const patient = await Patient.findById(patientId);
      if (!patient) return res.status(404).json({ error: "Patient not found" });

      const labTestCode = await generateLabTestCode();

      const labTest = new LabTest({
        patientId,
        testName,
        result,
        unit: unit || "",
        referenceRange: referenceRange || "",
        performedBy: performedBy || req.user.name,
        labTestCode,
      });

      const savedLabTest = await labTest.save();

      // Push to patient's labTests array
      patient.labTests = patient.labTests || [];
      patient.labTests.push(savedLabTest._id);
      await patient.save();

      const populatedLabTest = await LabTest.findById(savedLabTest._id)
        .populate("patientId", "name patientCode");

      res.status(201).json(populatedLabTest);
    } catch (err) {
      console.error("Error adding lab test:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

module.exports = router;
