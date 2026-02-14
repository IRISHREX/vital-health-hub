const mongoose = require('mongoose');

const radiologyOrderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true,
    sparse: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  admission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admission'
  },
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  studyType: {
    type: String,
    enum: ['xray', 'ct_scan', 'mri', 'ultrasound', 'mammography', 'fluoroscopy', 'pet_scan', 'dexa', 'angiography', 'other'],
    required: true
  },
  bodyPart: {
    type: String,
    required: true
  },
  studyName: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    enum: ['routine', 'urgent', 'stat'],
    default: 'routine'
  },
  clinicalHistory: String,
  indication: String,
  status: {
    type: String,
    enum: ['ordered', 'scheduled', 'in_progress', 'completed', 'reported', 'verified', 'delivered', 'cancelled'],
    default: 'ordered'
  },
  scheduledAt: Date,
  performedAt: Date,
  completedAt: Date,
  // Report
  findings: String,
  impression: String,
  recommendation: String,
  reportNotes: String,
  reportGeneratedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reportGeneratedAt: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date,
  // Pricing
  price: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  // Billing
  billed: {
    type: Boolean,
    default: false
  },
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  // Staff
  orderedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Contrast
  contrastUsed: {
    type: Boolean,
    default: false
  },
  contrastType: String,
  // Attachments (image file references)
  attachments: [{
    fileName: String,
    fileUrl: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  notes: String
}, {
  timestamps: true
});

// Auto-generate order ID
radiologyOrderSchema.pre('save', async function(next) {
  if (!this.orderId) {
    const date = new Date();
    const yy = date.getFullYear().toString().slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const count = await this.constructor.countDocuments();
    this.orderId = `RAD${yy}${mm}${dd}${String(count + 1).padStart(4, '0')}`;
  }
  if (this.price !== undefined && this.totalAmount === undefined) {
    this.totalAmount = Math.max(0, this.price - (this.discount || 0));
  }
  next();
});

radiologyOrderSchema.index({ patient: 1, createdAt: -1 });
radiologyOrderSchema.index({ status: 1 });
radiologyOrderSchema.index({ studyType: 1 });

module.exports = mongoose.model('RadiologyOrder', radiologyOrderSchema);
