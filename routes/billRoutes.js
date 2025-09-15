const express = require("express");
const router = express.Router();
const Bill = require("../models/Bill");
const Patient = require("../models/Patient");
const { authMiddleware } = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const ROLES = require("../config/roles");

// ================== Helper: Generate sequential bill ID ==================
const generateBillId = async () => {
  const lastBill = await Bill.findOne().sort({ createdAt: -1 });
  if (!lastBill) return "INV0001";

  const lastIdNum = parseInt(lastBill.billId.replace("INV", ""), 10);
  const newIdNum = lastIdNum + 1;
  return `INV${newIdNum.toString().padStart(4, "0")}`; // INV0001, INV0002
};

// ================== CREATE new bill ==================
router.post(
  "/",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR]),
  async (req, res) => {
    try {
      const { patient, items } = req.body;
      if (!items || items.length === 0)
        return res.status(400).json({ error: "Bill must have at least one item" });

      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

      const bill = new Bill({
        billId: await generateBillId(),
        patient,
        items,
        totalAmount,
        createdBy: req.user.id,
      });

      const saved = await bill.save();
      const populated = await Bill.findById(saved._id)
        .populate("patient", "name patientCode")
        .populate("createdBy", "name staffCode role");

      res.status(201).json({
        id: populated._id,
        billId: populated.billId,
        patient: populated.patient,
        items: populated.items,
        totalAmount: populated.totalAmount,
        status: populated.status,
        createdBy: populated.createdBy,
        createdAt: populated.createdAt,
        updatedAt: populated.updatedAt,
      });
    } catch (err) {
      console.error("Error creating bill:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ================== GET all bills ==================
router.get(
  "/",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.RECEPTIONIST]),
  async (req, res) => {
    try {
      const bills = await Bill.find()
        .populate("patient", "name patientCode")
        .populate("createdBy", "name staffCode role")
        .sort({ createdAt: -1 });

      res.json(
        bills.map(b => ({
          id: b._id,
          billId: b.billId,
          patient: b.patient,
          items: b.items,
          totalAmount: b.totalAmount,
          status: b.status,
          createdBy: b.createdBy,
          createdAt: b.createdAt,
          updatedAt: b.updatedAt,
        }))
      );
    } catch (err) {
      console.error("Error fetching bills:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ================== GET bills for a patient ==================
router.get(
  "/patient/:id",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR]),
  async (req, res) => {
    try {
      const bills = await Bill.find({ patient: req.params.id })
        .populate("patient", "name patientCode")
        .populate("createdBy", "name staffCode role")
        .sort({ createdAt: -1 });

      res.json(
        bills.map(b => ({
          id: b._id,
          billId: b.billId,
          patient: b.patient,
          items: b.items,
          totalAmount: b.totalAmount,
          status: b.status,
          createdBy: b.createdBy,
          createdAt: b.createdAt,
          updatedAt: b.updatedAt,
        }))
      );
    } catch (err) {
      console.error("Error fetching patient bills:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ================== UPDATE bill status ==================
router.patch(
  "/:id/status",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.RECEPTIONIST]),
  async (req, res) => {
    try {
      const { status } = req.body;
      if (!["unpaid", "paid", "pending"].includes(status))
        return res.status(400).json({ error: "Invalid status" });

      const updated = await Bill.findByIdAndUpdate(req.params.id, { status }, { new: true })
        .populate("patient", "name patientCode")
        .populate("createdBy", "name staffCode role");

      if (!updated) return res.status(404).json({ error: "Bill not found" });

      res.json({
        id: updated._id,
        billId: updated.billId,
        patient: updated.patient,
        items: updated.items,
        totalAmount: updated.totalAmount,
        status: updated.status,
        createdBy: updated.createdBy,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      });
    } catch (err) {
      console.error("Error updating bill status:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ================== DELETE bill ==================
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN]),
  async (req, res) => {
    try {
      const deleted = await Bill.findByIdAndDelete(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Bill not found" });

      res.json({ message: "Bill deleted successfully", billId: deleted._id });
    } catch (err) {
      console.error("Error deleting bill:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
