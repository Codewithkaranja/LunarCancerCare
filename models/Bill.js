// models/Bill.js
const mongoose = require("mongoose");

const billSchema = new mongoose.Schema(
  {
    billId: {
      type: String,
      required: true,
      unique: true, // e.g. INV001
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    items: [
      {
        description: { type: String, required: true }, // e.g. "Consultation", "Lab Test"
        amount: { type: Number, required: true },       // cost of the service
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["unpaid", "paid", "pending"],
      default: "unpaid",
    },
    issuedDate: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff", // who generated this bill
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bill", billSchema);
