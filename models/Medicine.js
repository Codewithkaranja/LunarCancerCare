const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  batch: { type: String, default: "" },
  description: { type: String, default: "" },
  category: { type: String, default: "General" },
  quantity: { type: Number, default: 0 },
  unit: { type: String, default: "pcs" },
  price: { type: Number, default: 0 },
  expiryDate: { type: Date },
  reorderLevel: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ["Active", "Expired"], 
    default: "Active" 
  }
}, { timestamps: true });

// Pre-save hook to mark expired medicines
medicineSchema.pre("save", function(next) {
  if (this.expiryDate && this.expiryDate < new Date()) {
    this.status = "Expired";
  }
  next();
});

const Medicine = mongoose.model("Medicine", medicineSchema);

// ---------------- Backfill existing records ----------------
async function backfillExisting() {
  try {
    await mongoose.connect("mongodb://localhost:27017/your-db-name", {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const medicines = await Medicine.find({});
    for (let med of medicines) {
      let changed = false;

      if (med.batch === undefined) {
        med.batch = "";
        changed = true;
      }
      if (med.price === undefined) {
        med.price = 0;
        changed = true;
      }

      if (changed) await med.save();
    }

    console.log("Backfill completed successfully!");
    mongoose.connection.close();
  } catch (err) {
    console.error("Backfill error:", err);
  }
}

// Run backfill only if this file is run directly
if (require.main === module) {
  backfillExisting();
}

module.exports = Medicine;
