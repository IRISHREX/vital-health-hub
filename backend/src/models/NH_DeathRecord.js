const mongoose = require('mongoose');

const deathRecordSchema = new mongoose.Schema({
  recordNumber: { type: String, index: true },
  certificateNumber: { type: String, trim: true },

  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  admission: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission' },

  deceasedName: { type: String, required: true, trim: true },
  gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
  age: { type: Number, min: 0 },
  ageUnit: { type: String, enum: ['years', 'months', 'days'], default: 'years' },
  dateOfBirth: { type: Date },
  dateOfDeath: { type: Date, required: true },
  timeOfDeath: { type: String, trim: true },

  placeOfDeath: {
    type: String,
    enum: ['hospital', 'home', 'in_transit', 'brought_dead', 'other'],
    default: 'hospital'
  },
  ward: { type: String, trim: true },
  roomNumber: { type: String, trim: true },
  bedNumber: { type: String, trim: true },

  causeImmediate: { type: String, trim: true },
  causeAntecedent: { type: String, trim: true },
  causeUnderlying: { type: String, trim: true },
  mannerOfDeath: {
    type: String,
    enum: ['natural', 'accident', 'suicide', 'homicide', 'pending_investigation', 'undetermined'],
    default: 'natural'
  },
  postMortemRequired: { type: Boolean, default: false },
  postMortemDone: { type: Boolean, default: false },
  policeInformed: { type: Boolean, default: false },
  policeStation: { type: String, trim: true },
  mlcNumber: { type: String, trim: true },

  certifyingDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  certifiedAt: { type: Date },

  // Next of kin / body handover
  informantName: { type: String, trim: true },
  informantRelation: { type: String, trim: true },
  phone: { type: String, trim: true },
  address: { type: String, trim: true },
  bodyHandedOverTo: { type: String, trim: true },
  bodyHandoverAt: { type: Date },

  religion: { type: String, trim: true },
  nationality: { type: String, trim: true, default: 'Indian' },

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

deathRecordSchema.index({ dateOfDeath: -1 });

module.exports = mongoose.model('DeathRecord', deathRecordSchema);
