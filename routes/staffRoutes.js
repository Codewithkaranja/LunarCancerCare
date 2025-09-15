// routes/staffRoutes.js
const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const Staff = require("../models/Staff");
const { authMiddleware } = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const ROLES = require("../config/roles");

// ================== Helper: Generate sequential staff code ==================
const generateStaffCode = async () => {
  const count = await Staff.countDocuments();
  return `ST${(count + 1).toString().padStart(4, "0")}`; // ST0001, ST0002, etc.
};

// ================== GET all staff ==================
router.get(
  "/",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE, ROLES.RECEPTIONIST, ROLES.PHARMACIST]),
  async (req, res) => {
    try {
      const staff = await Staff.find().select("-password");
      res.json(
        staff.map((s) => ({
          id: s._id,
          staffCode: s.staffCode,
          name: s.name,
          username: s.username,
          role: s.role,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        }))
      );
    } catch (err) {
      console.error("Error fetching staff:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ================== ADD new staff ==================
router.post("/", async (req, res) => {
  try {
    const { name, username, password, role } = req.body;
    if (!name || !username || !password || !role)
      return res.status(400).json({ error: "All fields are required" });

    const existing = await Staff.findOne({ username });
    if (existing) return res.status(409).json({ error: "Username already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const staffCode = await generateStaffCode();
    const normalizedRole = role.toLowerCase();

    // Bootstrap first admin
    const hasAdmin = await Staff.exists({ role: ROLES.ADMIN });
    if (!hasAdmin && normalizedRole === ROLES.ADMIN.toLowerCase()) {
      const staff = new Staff({
        name,
        username,
        password: hashedPassword,
        role: ROLES.ADMIN,
        staffCode,
        failedLogins: 0,
        mustChangePassword: false,
      });
      const savedStaff = await staff.save();
      return res.status(201).json({
        id: savedStaff._id,
        staffCode: savedStaff.staffCode,
        name: savedStaff.name,
        username: savedStaff.username,
        role: savedStaff.role,
        bootstrap: true,
      });
    }

    // Require auth + admin for other staff creation
    return authMiddleware(req, res, async () => {
      await roleMiddleware([ROLES.ADMIN])(req, res, async () => {
        const staff = new Staff({
          name,
          username,
          password: hashedPassword,
          role: normalizedRole,
          staffCode,
          failedLogins: 0,
          mustChangePassword: false,
        });
        const savedStaff = await staff.save();
        res.status(201).json({
          id: savedStaff._id,
          staffCode: savedStaff.staffCode,
          name: savedStaff.name,
          username: savedStaff.username,
          role: savedStaff.role,
        });
      });
    });
  } catch (err) {
    console.error("Error adding staff:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ================== UPDATE staff ==================
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN]),
  async (req, res) => {
    try {
      const updateData = {};
      if (req.body.name) updateData.name = req.body.name;
      if (req.body.username) updateData.username = req.body.username;
      if (req.body.role) updateData.role = req.body.role.toLowerCase();
      if (req.body.password) updateData.password = await bcrypt.hash(req.body.password, 10);

      const updatedStaff = await Staff.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true,
      }).select("-password");

      if (!updatedStaff) return res.status(404).json({ error: "Staff not found" });

      res.json({
        id: updatedStaff._id,
        staffCode: updatedStaff.staffCode,
        name: updatedStaff.name,
        username: updatedStaff.username,
        role: updatedStaff.role,
        createdAt: updatedStaff.createdAt,
        updatedAt: updatedStaff.updatedAt,
      });
    } catch (err) {
      console.error("Error updating staff:", err);
      res.status(500).json({ error: "Internal server error" });
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
      res.json({ message: "Staff deleted successfully", staffId: deletedStaff._id });
    } catch (err) {
      console.error("Error deleting staff:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ================== RESET PASSWORD ==================
router.put(
  "/:id/reset-password",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN]),
  async (req, res) => {
    try {
      const { password } = req.body;
      if (!password) return res.status(400).json({ error: "Password required" });

      const hashedPassword = await bcrypt.hash(password, 10);
      const updatedStaff = await Staff.findByIdAndUpdate(
        req.params.id,
        { password: hashedPassword, mustChangePassword: false },
        { new: true }
      ).select("-password");

      if (!updatedStaff) return res.status(404).json({ error: "Staff not found" });

      res.json({ message: "Password reset successfully", staffId: updatedStaff._id });
    } catch (err) {
      console.error("Error resetting password:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ================== RESET FAILED LOGINS ==================
router.put(
  "/:id/reset-failed-logins",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN]),
  async (req, res) => {
    try {
      const staff = await Staff.findById(req.params.id);
      if (!staff) return res.status(404).json({ error: "Staff not found" });

      staff.failedLogins = 0;
      if ("isLocked" in staff) staff.isLocked = false;
      await staff.save();

      res.json({ message: "Failed login attempts reset", staffId: staff._id });
    } catch (err) {
      console.error("Error resetting failed logins:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

module.exports = router;
