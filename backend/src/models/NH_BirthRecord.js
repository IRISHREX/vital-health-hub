const mongoose = require('mongoose');

const birthRecordSchema = new mongoose.Schema({
  recordNumber: { type: String, index: true },
  certificateNumber: { type: String, trim: true },

  // Linkage (optional — supports walk-in / external deliveries)
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  admission: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission' },

  // Baby
  babyName: { type: String, trim: true },
  gender: { type: String, enum: ['male', 'female', 'other', 'ambiguous'], default: 'other' },
  dateOfBirth: { type: Date, required: true },
  timeOfBirth: { type: String, trim: true },
  weightGrams: { type: Number, min: 0 },
  gestationWeeks: { type: Number, min: 0 },
  apgarScore: { type: String, trim: true },
  birthOrder: { type: Number, min: 1, default: 1 },
  multipleBirth: { type: String, enum: ['single', 'twin', 'triplet', 'other'], default: 'single' },
  liveBirth: { type: Boolean, default: true },

  // Delivery
  deliveryType: {
    type: String,
    enum: ['normal', 'c_section', 'assisted', 'water', 'other'],
    default: 'normal'
  },
  placeOfBirth: { type: String, trim: true },
  ward: { type: String, trim: true },
  roomNumber: { type: String, trim: true },
  attendingDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  attendingNurse: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Parents / informant
  motherName: { type: String, required: true, trim: true },
  motherAge: { type: Number, min: 0 },
  motherAadhaar: { type: String, trim: true },
  fatherName: { type: String, trim: true },
  fatherAge: { type: Number, min: 0 },
  religion: { type: String, trim: true },
  nationality: { type: String, trim: true, default: 'Indian' },
  address: { type: String, trim: true },
  phone: { type: String, trim: true },
  informantName: { type: String, trim: true },
  informantRelation: { type: String, trim: true },

  status: {
    type: String,
    enum: ['draft', 'registered', 'certificate_issued', 'cancelled'],
    default: 'registered',
    index: true
  },
  issuedAt: { type: Date },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancelReason: { type: String, trim: true },
  notes: { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

birthRecordSchema.index({ dateOfBirth: -1 });
birthRecordSchema.index({ babyName: 'text', motherName: 'text', fatherName: 'text' });

module.exports = mongoose.model('BirthRecord', birthRecordSchema);
