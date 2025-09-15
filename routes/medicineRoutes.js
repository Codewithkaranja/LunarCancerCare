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
          batch: m.batch,
          description: m.description,
          category: m.category,
          quantity: m.quantity,
          unit: m.unit,
          price: m.price,
          expiryDate: m.expiryDate,
          reorderLevel: m.reorderLevel,
          status: m.status,
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

// ================== GET single medicine by ID ==================
router.get(
  "/:id",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.PHARMACIST]),
  async (req, res) => {
    try {
      const medicine = await Medicine.findById(req.params.id);
      if (!medicine) {
        return res.status(404).json({ error: "Medicine not found" });
      }

      res.json({
        id: medicine._id,
        medicineCode: medicine.medicineCode,
        name: medicine.name,
        manufacturer: medicine.manufacturer || "",
        batch: medicine.batch,
        description: medicine.description,
        category: medicine.category,
        quantity: medicine.quantity,
        unit: medicine.unit,
        price: medicine.price,
        expiryDate: medicine.expiryDate,
        reorderLevel: medicine.reorderLevel,
        status: medicine.status,
        createdAt: medicine.createdAt,
        updatedAt: medicine.updatedAt,
      });
    } catch (err) {
      console.error("Error fetching medicine by ID:", err);
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
      const { name, manufacturer, quantity, price, batch, description, category, unit, expiryDate, reorderLevel } = req.body;

      if (!name || quantity == null || price == null) {
        return res
          .status(400)
          .json({ error: "Name, quantity, and price are required" });
      }

      const existing = await Medicine.findOne({ name: name.trim() });
      if (existing) return res.status(409).json({ error: "Medicine already exists" });

      const medicineCode = `MED-${shortid.generate().toUpperCase()}`;

      const medicine = new Medicine({
        name: name.trim(),
        manufacturer: manufacturer || "",
        batch: batch || "",
        description: description || "",
        category: category || "General",
        unit: unit || "pcs",
        expiryDate: expiryDate || null,
        reorderLevel: reorderLevel || 0,
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
        batch: saved.batch,
        description: saved.description,
        category: saved.category,
        quantity: saved.quantity,
        unit: saved.unit,
        price: saved.price,
        expiryDate: saved.expiryDate,
        reorderLevel: saved.reorderLevel,
        status: saved.status,
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
      const { name, manufacturer, quantity, price, batch, description, category, unit, expiryDate, reorderLevel } = req.body;

      if (!name || quantity == null || price == null) {
        return res
          .status(400)
          .json({ error: "Name, quantity, and price are required" });
      }

      const updated = await Medicine.findByIdAndUpdate(
        req.params.id,
        {
          name: name.trim(),
          manufacturer: manufacturer || "",
          batch: batch || "",
          description: description || "",
          category: category || "General",
          unit: unit || "pcs",
          expiryDate: expiryDate || null,
          reorderLevel: reorderLevel || 0,
          quantity,
          price,
        },
        { new: true, runValidators: true }
      );

      if (!updated) return res.status(404).json({ error: "Medicine not found" });

      res.json({
        id: updated._id,
        medicineCode: updated.medicineCode,
        name: updated.name,
        manufacturer: updated.manufacturer || "",
        batch: updated.batch,
        description: updated.description,
        category: updated.category,
        quantity: updated.quantity,
        unit: updated.unit,
        price: updated.price,
        expiryDate: updated.expiryDate,
        reorderLevel: updated.reorderLevel,
        status: updated.status,
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
