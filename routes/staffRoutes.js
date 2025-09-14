// routes/staffRoutes.js
const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const Staff = require("../models/Staff");
const { authMiddleware } = require("../middleware/authMiddleware"); // ✅ destructured
const roleMiddleware = require("../middleware/roleMiddleware");
const ROLES = require("../config/roles");

// Helper to generate human-friendly staff codes: e.g., ST0001
const generateStaffCode = async () => {
  const count = await Staff.countDocuments();
  return `ST${(count + 1).toString().padStart(4, "0")}`;
};

// ================== GET all staff ==================
router.get(
  "/",
  authMiddleware,
  roleMiddleware([
    ROLES.ADMIN,
    ROLES.DOCTOR,
    ROLES.NURSE,
    ROLES.RECEPTIONIST,
    ROLES.PHARMACIST,
  ]),
  async (req, res) => {
    try {
      const staff = await Staff.find().select("-password"); // exclude password
      res.json(staff);
    } catch (err) {
      console.error("Error fetching staff:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ================== ADD staff ==================
router.post(
  "/",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN]),
  async (req, res) => {
    const { name, username, password, role } = req.body;

    if (!name || !username || !password || !role) {
      return res.status(400).json({ error: "All fields are required" });
    }

    try {
      const existing = await Staff.findOne({ username });
      if (existing) return res.status(409).json({ error: "Username already exists" });

      const hashedPassword = await bcrypt.hash(password, 10);
      const staffCode = await generateStaffCode(); // ✅ generate code

      const staff = new Staff({
        name,
        username,
        password: hashedPassword,
        role,
        staffCode, // ✅ include code
      });

      const savedStaff = await staff.save();
      res.status(201).json({
        id: savedStaff._id,
        staffCode: savedStaff.staffCode, // ✅ return code
        name: savedStaff.name,
        username: savedStaff.username,
        role: savedStaff.role,
      });
    } catch (err) {
      console.error("Error adding staff:", err);
      res.status(400).json({ error: err.message });
    }
  }
);

// ================== UPDATE staff ==================
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN]),
  async (req, res) => {
    try {
      const updateData = { ...req.body };

      // Hash password if provided
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 10);
      }

      const updatedStaff = await Staff.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      ).select("-password");

      if (!updatedStaff) return res.status(404).json({ error: "Staff not found" });

      res.json(updatedStaff);
    } catch (err) {
      console.error("Error updating staff:", err);
      res.status(400).json({ error: err.message });
    }
  }
);

// ================== DELETE staff ==================
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN]),
  async (req, res) => {
    try {
      const deletedStaff = await Staff.findByIdAndDelete(req.params.id);
      if (!deletedStaff) return res.status(404).json({ error: "Staff not found" });

      res.json({ message: "Staff deleted successfully" });
    } catch (err) {
      console.error("Error deleting staff:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
