const mongoose = require('mongoose');

const returnItemSchema = new mongoose.Schema({
  itemRef: { type: mongoose.Schema.Types.ObjectId },
  itemModel: { type: String },
  name: { type: String },
  qty: { type: Number, required: true, min: 0.0001 },
  unitPrice: { type: Number, default: 0 },
  amount: { type: Number, default: 0 },
  reason: { type: String },
  condition: { type: String, enum: ['unused', 'opened', 'damaged', 'expired', 'other'], default: 'unused' }
}, { _id: false });

const returnRequestSchema = new mongoose.Schema({
  module: { type: String, enum: ['pharmacy', 'lab', 'radiology', 'ot', 'service', 'other'], required: true },
  sourceType: { type: String },
  sourceId: { type: mongoose.Schema.Types.ObjectId },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  admission: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission' },
  items: [returnItemSchema],
  totalAmount: { type: Number, default: 0 },
  refundMode: { type: String, enum: ['credit_note', 'cash', 'adjust_invoice', 'none'], default: 'none' },
  refundAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'], default: 'pending', index: true },
  approvalRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'ApprovalRequest' },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processedAt: { type: Date },
  notes: { type: String }
}, { timestamps: true });

returnRequestSchema.index({ patient: 1, createdAt: -1 });
returnRequestSchema.index({ module: 1, status: 1 });

module.exports = mongoose.model('ReturnRequest', returnRequestSchema);
