const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['bed_charges', 'doctor_fee', 'nursing', 'medication', 'procedure', 'lab_test', 'radiology', 'surgery', 'other'],
    required: true
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const paymentSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  method: {
    type: String,
    enum: ['cash', 'card', 'upi', 'net_banking', 'cheque', 'insurance'],
    required: true
  },
  reference: String,
  paidAt: {
    type: Date,
    default: Date.now
  },
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { _id: true });

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    unique: true
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
    enum: ['opd', 'ipd', 'pharmacy', 'lab', 'emergency', 'other'],
    required: true
  },
  items: [invoiceItemSchema],
  subtotal: {
    type: Number,
    default: 0,
    min: 0
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  discountReason: String,
  taxDetails: {
    cgst: {
      rate: { type: Number, default: 0 },
      amount: { type: Number, default: 0 }
    },
    sgst: {
      rate: { type: Number, default: 0 },
      amount: { type: Number, default: 0 }
    },
    igst: {
      rate: { type: Number, default: 0 },
      amount: { type: Number, default: 0 }
    }
  },
  totalTax: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  dueAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'partial', 'paid', 'overdue', 'cancelled', 'refunded'],
    default: 'draft'
  },
  dueDate: {
    type: Date,
    required: true
  },
  payments: [paymentSchema],
  notes: String,
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  facility: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Facility'
  }
}, {
  timestamps: true
});

// Generate invoice number
invoiceSchema.pre('save', async function(next) {
  if (!this.invoiceNumber) {
    const count = await this.constructor.countDocuments();
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    this.invoiceNumber = `INV${year}${month}${String(count + 1).padStart(5, '0')}`;
  }
  
  // Calculate due amount
  this.dueAmount = this.totalAmount - this.paidAmount;
  
  // Update status based on payments
  if (this.paidAmount >= this.totalAmount && this.totalAmount > 0) {
    this.status = 'paid';
  } else if (this.paidAmount > 0 && this.paidAmount < this.totalAmount) {
    this.status = 'partial';
  }
  
  next();
});

// Indexes
invoiceSchema.index({ patient: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
