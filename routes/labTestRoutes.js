const express = require("express");
const router = express.Router();
const LabTest = require("../models/labTest");
const Patient = require("../models/Patient");
const Staff = require("../models/Staff");
const { authMiddleware } = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const ROLES = require("../config/roles");

// Helper: generate sequential lab test code
const generateLabTestCode = async () => {
  const count = await LabTest.countDocuments();
  return `LAB${(count + 1).toString().padStart(4, "0")}`;
};

// ================== TEST ROUTE ==================
router.get("/test", (req, res) => {
  res.json({ message: "Lab Test route is working!" });
});

// ================== GET ALL LAB TESTS ==================
router.get("/", authMiddleware, async (req, res) => {
  try {
    const labTests = await LabTest.find().populate("patientId", "name patientCode");
    res.json(labTests);
  } catch (err) {
    console.error("Error fetching lab tests:", err.message, err.stack);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ================== GET LAB TEST BY ID ==================
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const labTest = await LabTest.findById(req.params.id).populate("patientId", "name patientCode");
    if (!labTest) return res.status(404).json({ error: "Lab test not found" });
    res.json(labTest);
  } catch (err) {
    console.error("Error fetching lab test:", err.message, err.stack);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ================== POST ADD LAB TEST ==================
router.post(
  "/",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE, ROLES.PHARMACIST]),
  async (req, res) => {
    try {
      const { patientId, testName, result, unit, referenceRange, performedBy } = req.body;

      console.log("POST /lab-tests body:", req.body);
      console.log("Logged-in user:", req.user);

      if (!patientId || !testName || !result) {
        return res.status(400).json({ error: "patientId, testName, and result are required" });
      }

      // Verify patient exists
      const patient = await Patient.findById(patientId);
      if (!patient) {
        console.error("Patient not found for ID:", patientId);
        return res.status(404).json({ error: "Patient not found" });
      }

      // Generate lab test code
      const labTestCode = await generateLabTestCode();

      // Determine performedBy name safely
      let performedByName = performedBy;
      if (!performedByName) {
        try {
          const staff = await Staff.findById(req.user?.id);
          performedByName = staff ? staff.name : "System";
        } catch (err) {
          console.warn("Failed to fetch staff for performedBy:", err.message);
          performedByName = "System";
        }
      }

      // Create new lab test
      const labTest = new LabTest({
        patientId,
        testName,
        result,
        unit: unit || "",
        referenceRange: referenceRange || "",
        performedBy: performedByName,
        labTestCode,
      });

      const savedLabTest = await labTest.save();

      // Add labTest to patient's array WITHOUT triggering full validation
      patient.labTests = patient.labTests || [];
      patient.labTests.push(savedLabTest._id);
      await patient.save({ validateBeforeSave: false });

      const populatedLabTest = await LabTest.findById(savedLabTest._id)
        .populate("patientId", "name patientCode");

      res.status(201).json(populatedLabTest);
    } catch (err) {
      console.error("Error adding lab test:", err.message, err.stack);
      res.status(500).json({
        error: "Internal server error",
        details: err.message,
      });
    }
  }
);

// ================== PUT UPDATE LAB TEST ==================
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE]),
  async (req, res) => {
    try {
      const { testName, result, unit, referenceRange, performedBy } = req.body;

      const updated = await LabTest.findByIdAndUpdate(
        req.params.id,
        { testName, result, unit, referenceRange, performedBy },
        { new: true }
      ).populate("patientId", "name patientCode");

      if (!updated) return res.status(404).json({ error: "Lab test not found" });

      res.json(updated);
    } catch (err) {
      console.error("Error updating lab test:", err.message, err.stack);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ================== DELETE LAB TEST ==================
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.DOCTOR]),
  async (req, res) => {
    try {
      const labTest = await LabTest.findByIdAndDelete(req.params.id);
      if (!labTest) return res.status(404).json({ error: "Lab test not found" });

      // Remove from patient's labTests array
      const patient = await Patient.findById(labTest.patientId);
      if (patient) {
        patient.labTests = patient.labTests.filter(id => id.toString() !== labTest._id.toString());
        await patient.save({ validateBeforeSave: false });
      }

      res.json({ message: "Lab test deleted successfully" });
    } catch (err) {
      console.error("Error deleting lab test:", err.message, err.stack);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

module.exports = router;
