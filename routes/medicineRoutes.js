// routes/medicineRoutes.js
const express = require("express");
const router = express.Router();
const shortid = require("shortid"); // ✅ for medicine codes
const Medicine = require("../models/Medicine");
const { authMiddleware } = require("../middleware/authMiddleware"); // ✅ destructured
const roleMiddleware = require("../middleware/roleMiddleware");
const ROLES = require("../config/roles");

// ================== GET all medicines ==================
router.get(
  "/",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.PHARMACIST]),
  async (req, res) => {
    try {
      const medicines = await Medicine.find().sort({ name: 1 });
      res.json(medicines);
    } catch (err) {
      console.error("Error fetching medicines:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ================== ADD medicine ==================
router.post(
  "/",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.PHARMACIST]),
  async (req, res) => {
    const { name, manufacturer, quantity, price } = req.body;

    if (!name || !quantity || !price) {
      return res.status(400).json({ error: "Name, quantity, and price are required" });
    }

    try {
      const existing = await Medicine.findOne({ name });
      if (existing) return res.status(409).json({ error: "Medicine already exists" });

      // ✅ generate human-friendly medicine code
      const medicineCode = "MED-" + shortid.generate().toUpperCase();

      const medicine = new Medicine({
        name,
        manufacturer: manufacturer || "",
        quantity,
        price,
        medicineCode, // ✅ added
      });

      const savedMedicine = await medicine.save();
      res.status(201).json(savedMedicine);
    } catch (err) {
      console.error("Error adding medicine:", err);
      res.status(400).json({ error: err.message });
    }
  }
);

// ================== UPDATE medicine ==================
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.PHARMACIST]),
  async (req, res) => {
    try {
      const updatedMedicine = await Medicine.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );

      if (!updatedMedicine) return res.status(404).json({ error: "Medicine not found" });

      res.json(updatedMedicine);
    } catch (err) {
      console.error("Error updating medicine:", err);
      res.status(400).json({ error: err.message });
    }
  }
);

// ================== DELETE medicine ==================
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN]),
  async (req, res) => {
    try {
      const deletedMedicine = await Medicine.findByIdAndDelete(req.params.id);
      if (!deletedMedicine) return res.status(404).json({ error: "Medicine not found" });

      res.json({ message: "Medicine deleted successfully" });
    } catch (err) {
      console.error("Error deleting medicine:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
