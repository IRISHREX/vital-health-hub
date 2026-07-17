const mongoose = require('mongoose');

const indentItemSchema = new mongoose.Schema({
  medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  requestedQty: { type: Number, required: true, min: 1 },
  issuedQty: { type: Number, default: 0 },
  returnedQty: { type: Number, default: 0 },
  notes: { type: String }
}, { _id: true });

const medicineIndentSchema = new mongoose.Schema({
  indentNo: { type: String, index: true },
  ward: { type: String },
  floor: { type: String },
  admission: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission' },
  items: [indentItemSchema],
  status: {
    type: String,
    enum: ['requested', 'approved', 'issued', 'partially_returned', 'returned', 'cancelled', 'rejected'],
    default: 'requested',
    index: true
  },
  priority: { type: String, enum: ['routine', 'urgent', 'stat'], default: 'routine' },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  issuedAt: { type: Date },
  returnedAt: { type: Date },
  notes: { type: String }
}, { timestamps: true });

medicineIndentSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('MedicineIndent', medicineIndentSchema);
