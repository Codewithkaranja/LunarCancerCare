const Staff = require("../models/staffModel");
const bcrypt = require("bcryptjs");

// Staff registration
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
    res.status(201).json({ message: "Staff registered successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Staff login
exports.loginStaff = async (req, res) => {
  try {
    const { username, password } = req.body;

    const staff = await Staff.findOne({ username });
    if (!staff) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, staff.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    res.json({ message: "Login successful", staff });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
