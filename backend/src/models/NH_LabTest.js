const mongoose = require('mongoose');

const generateUniqueTestIdForDoc = async (model) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const sec = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    const rand = String(Math.floor(Math.random() * 100)).padStart(2, '0');
    const testId = `LAB${yy}${mm}${dd}${hh}${min}${sec}${ms}${rand}`;

    const exists = await model.exists({ testId });
    if (!exists) return testId;
  }

  throw new Error('Unable to generate unique test ID');
};

const generateUniqueSampleIdForDoc = async (model) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const sec = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    const rand = String(Math.floor(Math.random() * 100)).padStart(2, '0');
    const sampleId = `SMP${yy}${mm}${dd}${hh}${min}${sec}${ms}${rand}`;

    const exists = await model.exists({ sampleId });
    if (!exists) return sampleId;
  }

  throw new Error('Unable to generate unique sample ID');
};

const parameterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  unit: { type: String },
  normalRange: { type: String },
  value: { type: String },
  status: { type: String, enum: ['normal', 'abnormal', 'critical', 'pending'], default: 'pending' }
}, { _id: true });

const labTestSchema = new mongoose.Schema({
  testId: {
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
    ref: 'Doctor',
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
  // Test catalog info
  testName: {
    type: String,
    required: true
  },
  testCode: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['hematology', 'biochemistry', 'microbiology', 'pathology', 'radiology', 'immunology', 'urine', 'serology', 'other'],
    required: true
  },
  description: String,
  // Sample details
  sampleType: {
    type: String,
    enum: ['blood', 'urine', 'stool', 'sputum', 'csf', 'tissue', 'swab', 'other'],
    required: true
  },
  sampleId: String,
  sampleCollectedAt: Date,
  sampleCollectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  sampleStatus: {
    type: String,
    enum: ['pending_collection', 'collected', 'in_transit', 'received', 'processing', 'rejected'],
    default: 'pending_collection'
  },
  sampleRejectionReason: String,
  // Test workflow
  status: {
    type: String,
    enum: ['ordered', 'sample_collected', 'processing', 'completed', 'verified', 'delivered', 'cancelled'],
    default: 'ordered'
  },
  priority: {
    type: String,
    enum: ['routine', 'urgent', 'stat'],
    default: 'routine'
  },
  // Results
  parameters: [parameterSchema],
  interpretation: String,
  remarks: String,
  // Report
  reportGeneratedAt: Date,
  reportGeneratedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date,
  // Pricing
  price: {
    type: Number,
    required: true
  },
  discount: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  // Billing
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  billed: {
    type: Boolean,
    default: false
  },
  // Ordered by
  orderedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: String,
  // For tracking turnaround time
  expectedCompletionAt: Date,
  completedAt: Date
}, {
  timestamps: true
});

// Auto-generate test ID
labTestSchema.pre('save', async function(next) {
  if (!this.testId) {
    this.testId = await generateUniqueTestIdForDoc(this.constructor);
  }
  if (!this.sampleId && this.sampleStatus !== 'pending_collection') {
    this.sampleId = await generateUniqueSampleIdForDoc(this.constructor);
  }
  if (this.price !== undefined && this.totalAmount === undefined) {
    this.totalAmount = this.price - (this.discount || 0);
  }
  next();
});

labTestSchema.index({ patient: 1, createdAt: -1 });
labTestSchema.index({ status: 1 });
labTestSchema.index({ testId: 1 });
labTestSchema.index({ sampleStatus: 1 });
labTestSchema.index({ category: 1 });

module.exports = mongoose.model('LabTest', labTestSchema);
