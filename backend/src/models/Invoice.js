const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    unique: true,
    required: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  admission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admission'
  },
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  type: {
    type: String,
    enum: ['opd', 'ipd', 'pharmacy', 'lab', 'other'],
    required: true
  },
  items: [{
    description: { type: String, required: true },
    category: { 
      type: String, 
      enum: ['bed_charges', 'doctor_fee', 'nursing', 'medication', 'procedure', 'lab_test', 'radiology', 'surgery', 'other'],
      required: true 
    },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    amount: { type: Number, required: true }
  }],
  subtotal: {
    type: Number,
    required: true
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  discountReason: String,
  taxDetails: {
    cgst: { rate: Number, amount: Number },
    sgst: { rate: Number, amount: Number },
    igst: { rate: Number, amount: Number }
  },
  totalTax: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  dueAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'partial', 'paid', 'overdue', 'cancelled', 'refunded'],
    default: 'pending'
  },
  dueDate: {
    type: Date,
    required: true
  },
  payments: [{
    amount: Number,
    method: { 
      type: String, 
      enum: ['cash', 'card', 'upi', 'net_banking', 'cheque', 'insurance'] 
    },
    reference: String,
    paidAt: { type: Date, default: Date.now },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  insuranceClaim: {
    provider: String,
    policyNumber: String,
    claimNumber: String,
    claimAmount: Number,
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'partial'] },
    approvedAmount: Number
  },
  notes: String,
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Auto-generate invoice number
invoiceSchema.pre('save', async function(next) {
  if (!this.invoiceNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const count = await mongoose.model('Invoice').countDocuments();
    this.invoiceNumber = `INV${year}${month}${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// Update status based on payment
invoiceSchema.pre('save', function(next) {
  this.dueAmount = this.totalAmount - this.paidAmount;
  
  if (this.status !== 'cancelled' && this.status !== 'refunded') {
    if (this.paidAmount >= this.totalAmount) {
      this.status = 'paid';
    } else if (this.paidAmount > 0) {
      this.status = 'partial';
    } else if (new Date() > this.dueDate) {
      this.status = 'overdue';
    }
  }
  next();
});

// Indexes
invoiceSchema.index({ patient: 1, createdAt: -1 });
invoiceSchema.index({ status: 1, dueDate: 1 });
invoiceSchema.index({ invoiceNumber: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
