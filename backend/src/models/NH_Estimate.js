const mongoose = require('mongoose');

const estimateItemSchema = new mongoose.Schema({
  module: {
    type: String,
    enum: ['opd', 'ipd', 'appointment', 'lab', 'radiology', 'pharmacy', 'ot', 'other'],
    default: 'other'
  },
  description: { type: String, required: true, trim: true },
  sourceRef: { type: mongoose.Schema.Types.ObjectId },
  sourceType: { type: String, trim: true },
  quantity: { type: Number, default: 1, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 },
  notes: { type: String, trim: true }
}, { _id: false });

const estimateSchema = new mongoose.Schema({
  estimateNumber: { type: String, index: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  patientInfo: {
    name: { type: String, trim: true },
    age: { type: String, trim: true },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    phone: { type: String, trim: true }
  },
  scope: { type: String, enum: ['opd', 'ipd', 'package', 'mixed'], default: 'mixed' },
  admission: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission' },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  items: { type: [estimateItemSchema], default: [] },
  estimatedStayDays: { type: Number, min: 0 },
  subtotal: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  validUntil: { type: Date },
  status: {
    type: String,
    enum: ['draft', 'shared', 'approved', 'converted', 'expired', 'cancelled'],
    default: 'draft',
    index: true
  },
  convertedInvoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  notes: { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

estimateSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Estimate', estimateSchema);
