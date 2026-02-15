const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  genericName: { type: String, index: true },
  composition: { type: String, index: true },
  category: {
    type: String,
    enum: ['tablet', 'capsule', 'syrup', 'injection', 'ointment', 'drops', 'inhaler', 'powder', 'other'],
    default: 'tablet'
  },
  manufacturer: { type: String },
  batchNumber: { type: String },
  expiryDate: { type: Date },
  mrp: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  purchasePrice: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  reorderLevel: { type: Number, default: 10 },
  unit: { type: String, default: 'pcs' },
  rackLocation: { type: String },
  hsnCode: { type: String },
  gstPercent: { type: Number, default: 12 },
  schedule: { type: String, enum: ['', 'H', 'H1', 'X'], default: '' },
  isActive: { type: Boolean, default: true },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

medicineSchema.index({ name: 'text', genericName: 'text', composition: 'text' });

module.exports = mongoose.model('Medicine', medicineSchema);
