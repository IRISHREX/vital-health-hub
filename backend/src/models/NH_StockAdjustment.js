const mongoose = require('mongoose');

const stockAdjustmentSchema = new mongoose.Schema({
  medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  type: { type: String, enum: ['purchase', 'dispense', 'return', 'expired', 'damaged', 'adjustment'], required: true },
  quantity: { type: Number, required: true },
  previousStock: { type: Number, required: true },
  newStock: { type: Number, required: true },
  reason: { type: String },
  reference: { type: String },
  adjustedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

stockAdjustmentSchema.index({ medicine: 1, createdAt: -1 });

module.exports = mongoose.model('StockAdjustment', stockAdjustmentSchema);
