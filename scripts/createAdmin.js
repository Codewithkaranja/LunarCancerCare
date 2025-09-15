require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Staff = require("../models/Staff");
const ROLES = require("../config/roles"); // ✅ import roles enum

async function createAdmin() {
  // Connect to MongoDB
  await mongoose.connect(process.env.MONGO_URI);

  // Check if admin already exists
  const existingAdmin = await Staff.findOne({ username: "admin" });
  if (existingAdmin) {
    console.log("⚠️ Admin already exists!"); 
    // ⚠️ For future: if you need to reset the password instead of creating a new admin,
    // you can use the reset-password endpoint in staffRoutes.js
    return mongoose.disconnect();
  }

  // Hash the default password
  const hashedPassword = await bcrypt.hash("Admin@123", 10);

  // Create new admin user
  const admin = new Staff({
    name: "System Admin",
    username: "admin",
    password: hashedPassword,
    role: ROLES.ADMIN, // ✅ use enum to match schema
  });

  await admin.save();
  console.log("✅ Admin created: username=admin, password=Admin@123");

  // Disconnect from MongoDB
  mongoose.disconnect();
}

createAdmin();
