const Staff = require("../models/staffModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// =======================
// Staff Registration
// =======================
exports.registerStaff = async (req, res) => {
  try {
    const { name, role, department, email, phone, username, password } = req.body;

    // Check if username already exists
    const existing = await Staff.findOne({ username });
    if (existing) {
      return res.status(400).json({ message: "Username already taken" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newStaff = new Staff({
      name,
      role,
      department,
      email,
      phone,
      username,
      password: hashedPassword,
    });

    await newStaff.save();

    // ✅ Generate JWT immediately after registration
    const token = jwt.sign(
      { id: newStaff._id, role: newStaff.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const { password: _, ...userWithoutPassword } = newStaff.toObject();

    res.status(201).json({
      message: "Staff registered successfully",
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================
// Staff Login
// =======================
exports.loginStaff = async (req, res) => {
  try {
    const { username, password } = req.body;

    const staff = await Staff.findOne({ username });
    if (!staff) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, staff.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ✅ Generate JWT
    const token = jwt.sign(
      { id: staff._id, role: staff.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // ✅ Remove password before sending
    const { password: _, ...userWithoutPassword } = staff.toObject();

    res.json({
      message: "Login successful",
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
