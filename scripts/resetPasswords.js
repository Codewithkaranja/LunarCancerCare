require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Staff = require("../models/Staff"); // fixed path

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected..."))
.catch(err => console.log(err));

async function resetPasswords() {
  try {
    const staffs = await Staff.find();

    for (let staff of staffs) {
      const newPassword = "ChangeMe123!";
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      staff.password = hashedPassword;
      staff.mustChangePassword = true; // force password change
      await staff.save();

      console.log(`Password reset for ${staff.name} (${staff.username}) -> ${newPassword}`);
    }

    console.log("All staff passwords reset successfully!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

resetPasswords();
