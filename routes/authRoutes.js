const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const shortid = require("shortid");
const Staff = require("../models/Staff");
const { authMiddleware } = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const ROLES = require("../config/roles");

// ================= REGISTER staff (Admin only) =================
router.post(
  "/register",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN]),
  async (req, res) => {
    try {
      let { name, username, password, role } = req.body;
      if (!name || !username || !password || !role)
        return res.status(400).json({ message: "All fields are required" });

      role = role.toLowerCase();
      if (!Object.values(ROLES).includes(role))
        return res.status(400).json({ message: "Invalid role" });

      const existing = await Staff.findOne({ username });
      if (existing) return res.status(409).json({ message: "User already exists" });

      const hashedPassword = await bcrypt.hash(password, 10);
      const staffCode = "STF-" + shortid.generate().toUpperCase();

      const staff = new Staff({
        name,
        username,
        password: hashedPassword,
        role,
        staffCode,
        mustChangePassword: false,
      });

      await staff.save();

      res.status(201).json({ 
        message: "Staff registered successfully", 
        staffId: staff._id,
        staffCode: staff.staffCode
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Error registering staff", error: err.message });
    }
  }
);

// ================= LOGIN staff =================
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: "Username and password required" });

    const staff = await Staff.findOne({ username });
    if (!staff) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, staff.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    if (staff.mustChangePassword) {
      return res.status(200).json({
        message: "Please change your password",
        mustChangePassword: true,
        staffId: staff._id,
        staffCode: staff.staffCode
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
      staff: { id: staff._id, staffCode: staff.staffCode, name: staff.name, role: staff.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login error", error: err.message });
  }
});

// ================= UPDATE PASSWORD =================
router.put("/update-password/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.id !== req.params.id && req.user.role !== ROLES.ADMIN)
      return res.status(403).json({ message: "Not allowed to update this password" });

    const { password } = req.body;
    if (!password) return res.status(400).json({ message: "Password required" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const updated = await Staff.findByIdAndUpdate(
      req.params.id,
      { password: hashedPassword, mustChangePassword: false },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Staff not found" });

    res.json({ message: "Password updated successfully", staffCode: updated.staffCode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
