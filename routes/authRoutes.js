// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const shortid = require("shortid");
const Staff = require("../models/Staff");
const { authMiddleware } = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const ROLES = require("../config/roles");

// ================== TEST ROUTE ==================
router.get("/test", (req, res) => {
  res.json({ message: "Auth route is working!" });
});

// ================== REGISTER staff (Admin only) ==================
router.post(
  "/register",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN]),
  async (req, res) => {
    try {
      let { name, username, password, role } = req.body;
      if (!name || !username || !password || !role)
        return res.status(400).json({ error: "All fields are required" });

      role = role.toLowerCase();
      if (!Object.values(ROLES).includes(role))
        return res.status(400).json({ error: "Invalid role" });

      const existing = await Staff.findOne({ username });
      if (existing) return res.status(409).json({ error: "User already exists" });

      const hashedPassword = await bcrypt.hash(password, 10);
      const staffCode = "STF-" + shortid.generate().toUpperCase();

      const staff = new Staff({
        name,
        username,
        password: hashedPassword,
        role,
        staffCode,
        mustChangePassword: false,
        failedLogins: 0,
      });

      await staff.save();

      res.status(201).json({
        message: "Staff registered successfully",
        id: staff._id,
        staffCode: staff.staffCode,
        name: staff.name,
        username: staff.username,
        role: staff.role,
      });
    } catch (err) {
      console.error("Error registering staff:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ================== LOGIN staff (public) ==================
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: "Username and password required" });

    const staff = await Staff.findOne({ username });
    if (!staff) return res.status(401).json({ error: "Invalid credentials" });

    // ✅ Account lockout
    if (staff.failedLogins >= 5) {
      return res.status(403).json({ error: "Account locked. Too many failed attempts." });
    }

    const isMatch = await bcrypt.compare(password, staff.password);
    if (!isMatch) {
      staff.failedLogins += 1;
      await staff.save();
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // ✅ Reset failed logins on success
    staff.failedLogins = 0;
    await staff.save();

    // ✅ Require password change
    if (staff.mustChangePassword) {
      return res.status(200).json({
        message: "Please change your password",
        mustChangePassword: true,
        id: staff._id,
        staffCode: staff.staffCode,
      });
    }

    const token = jwt.sign(
      { id: staff._id, role: staff.role },
      process.env.JWT_SECRET || "supersecretkey",
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      staff: {
        id: staff._id,
        staffCode: staff.staffCode,
        name: staff.name,
        role: staff.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== UPDATE PASSWORD (self or admin) ==================
router.put("/update-password/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.id !== req.params.id && req.user.role !== ROLES.ADMIN)
      return res.status(403).json({ error: "Not allowed to update this password" });

    const { password } = req.body;
    if (!password) return res.status(400).json({ error: "Password required" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const updated = await Staff.findByIdAndUpdate(
      req.params.id,
      { password: hashedPassword, mustChangePassword: false },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Staff not found" });

    res.json({ message: "Password updated successfully", id: updated._id });
  } catch (err) {
    console.error("Error updating password:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== RESET FAILED LOGINS (Admin only) ==================
router.put(
  "/reset-failed-logins/:id",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN]),
  async (req, res) => {
    try {
      const staff = await Staff.findById(req.params.id);
      if (!staff) return res.status(404).json({ error: "Staff not found" });

      staff.failedLogins = 0;
      await staff.save();

      res.json({ message: "Failed login attempts reset", id: staff._id });
    } catch (err) {
      console.error("Error resetting failed logins:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ================== LOGOUT staff ==================
router.post("/logout", authMiddleware, (req, res) => {
  res.json({ message: "Logged out successfully. Please clear token on client." });
});

module.exports = router;
