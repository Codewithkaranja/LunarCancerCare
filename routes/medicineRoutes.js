// routes/medicineRoutes.js
const express = require("express");
const router = express.Router();
const shortid = require("shortid"); // For human-friendly medicine codes
const Medicine = require("../models/Medicine");
const { authMiddleware } = require("../middleware/authMiddleware");
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
      res.json(
        medicines.map((m) => ({
          id: m._id,
          medicineCode: m.medicineCode,
          name: m.name,
          manufacturer: m.manufacturer || "",
          quantity: m.quantity,
          price: m.price,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
        }))
      );
    } catch (err) {
      console.error("Error fetching medicines:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ================== ADD new medicine ==================
router.post(
  "/",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.PHARMACIST]),
  async (req, res) => {
    try {
      const { name, manufacturer, quantity, price } = req.body;

      if (!name || quantity == null || price == null) {
        return res.status(400).json({ error: "Name, quantity, and price are required" });
      }

      const existing = await Medicine.findOne({ name: name.trim() });
      if (existing) return res.status(409).json({ error: "Medicine already exists" });

      const medicineCode = `MED-${shortid.generate().toUpperCase()}`;

      const medicine = new Medicine({
        name: name.trim(),
        manufacturer: manufacturer || "",
        quantity,
        price,
        medicineCode,
      });

      const saved = await medicine.save();

      res.status(201).json({
        id: saved._id,
        medicineCode: saved.medicineCode,
        name: saved.name,
        manufacturer: saved.manufacturer,
        quantity: saved.quantity,
        price: saved.price,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
      });
    } catch (err) {
      console.error("Error adding medicine:", err);
      res.status(500).json({ error: "Internal server error" });
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
      const { name, manufacturer, quantity, price } = req.body;

      const updated = await Medicine.findByIdAndUpdate(
        req.params.id,
        { name, manufacturer, quantity, price },
        { new: true, runValidators: true }
      );

      if (!updated) return res.status(404).json({ error: "Medicine not found" });

      res.json({
        id: updated._id,
        medicineCode: updated.medicineCode,
        name: updated.name,
        manufacturer: updated.manufacturer || "",
        quantity: updated.quantity,
        price: updated.price,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      });
    } catch (err) {
      console.error("Error updating medicine:", err);
      res.status(500).json({ error: "Internal server error" });
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
      const deleted = await Medicine.findByIdAndDelete(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Medicine not found" });

      res.json({ message: "Medicine deleted successfully", medicineId: deleted._id });
    } catch (err) {
      console.error("Error deleting medicine:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

module.exports = router;
