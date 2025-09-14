require("dotenv").config();
const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB connected");
    const result = await Appointment.deleteMany({});
    console.log("Deleted appointments:", result.deletedCount);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
