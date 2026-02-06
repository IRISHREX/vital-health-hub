const mongoose = require('mongoose');

const serviceOrderSchema = new mongoose.Schema({
  admission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admission',
    required: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  facility: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Facility'
  },
  service: {
    id: { type: mongoose.Schema.Types.ObjectId },
    name: String,
    price: Number,
    duration: Number
  },
  type: {
    type: String,
    enum: ['lab', 'radiology', 'procedure', 'surgery', 'physiotherapy', 'other'],
    default: 'other'
  },
  status: {
    type: String,
    enum: ['ordered', 'in_progress', 'completed', 'cancelled'],
    default: 'ordered'
  },
  orderedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  orderedAt: {
    type: Date,
    default: Date.now
  },
  performedAt: {
    type: Date
  },
  result: String,
  notes: String,
  quantity: {
    type: Number,
    default: 1
  },
  unitPrice: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  billable: {
    type: Boolean,
    default: true
  },
  billed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

serviceOrderSchema.pre('validate', function(next) {
  const quantity = this.quantity || 1;
  if (this.unitPrice !== undefined && this.totalAmount === undefined) {
    this.totalAmount = quantity * this.unitPrice;
  }
  next();
});

serviceOrderSchema.index({ admission: 1, status: 1 });
serviceOrderSchema.index({ patient: 1, createdAt: -1 });

module.exports = mongoose.model('ServiceOrder', serviceOrderSchema);
