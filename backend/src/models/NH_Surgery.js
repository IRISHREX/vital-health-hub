const mongoose = require('mongoose');

const checklistItemSchema = new mongoose.Schema({
  label: { type: String, required: true },
  completed: { type: Boolean, default: false },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  completedAt: Date,
  notes: String
}, { _id: true });

const consumableSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, enum: ['medicine', 'implant', 'suture', 'disposable', 'equipment', 'other'], default: 'other' },
  quantity: { type: Number, default: 1 },
  unitPrice: { type: Number, default: 0 },
  amount: { type: Number, default: 0 },
  billed: { type: Boolean, default: false }
}, { _id: true });

const teamMemberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  role: { type: String, enum: ['surgeon', 'assistant_surgeon', 'anesthetist', 'scrub_nurse', 'circulating_nurse', 'technician', 'other'], required: true },
  name: String,
  fee: { type: Number, default: 0 }
}, { _id: true });

const surgerySchema = new mongoose.Schema({
  surgeryId: {
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
  otRoom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OTRoom'
  },

  // Surgery details
  procedureName: { type: String, required: true },
  procedureType: {
    type: String,
    enum: ['major', 'minor', 'emergency', 'day_care'],
    default: 'major'
  },
  diagnosis: String,
  urgency: {
    type: String,
    enum: ['elective', 'urgent', 'emergency'],
    default: 'elective'
  },
  bodyPart: String,
  laterality: { type: String, enum: ['left', 'right', 'bilateral', 'na'], default: 'na' },
  estimatedDuration: { type: Number, default: 60 }, // in minutes

  // Surgical team
  team: [teamMemberSchema],
  primarySurgeon: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  anesthetist: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },

  // Scheduling
  scheduledDate: Date,
  scheduledStartTime: String,
  scheduledEndTime: String,

  // Status workflow: requested → scheduled → preop_check → in_ot → anesthesia_started →
  //   surgery_started → surgery_ended → recovery → post_op → completed → cancelled
  status: {
    type: String,
    enum: [
      'requested', 'approved', 'scheduled', 'preop_check',
      'in_ot', 'anesthesia_started', 'surgery_started', 'surgery_ended',
      'recovery', 'post_op', 'completed', 'cancelled'
    ],
    default: 'requested'
  },
  cancelReason: String,

  // Pre-operative checklist
  preOpChecklist: [checklistItemSchema],

  // Anesthesia
  anesthesiaType: { type: String, enum: ['general', 'spinal', 'epidural', 'local', 'regional', 'sedation', 'combined'], default: 'general' },
  anesthesiaFitness: { type: String, enum: ['fit', 'unfit', 'pending'], default: 'pending' },
  asaGrade: { type: String, enum: ['I', 'II', 'III', 'IV', 'V', 'VI'] },

  // Timestamps (OT timeline)
  timestamps: {
    patientArrivedAt: Date,
    anesthesiaStartedAt: Date,
    incisionAt: Date,
    closureAt: Date,
    anesthesiaEndedAt: Date,
    patientOutAt: Date,
    recoveryStartAt: Date,
    recoveryEndAt: Date
  },

  // Intra-operative documentation
  operativeNotes: String,
  complications: String,
  bloodLoss: String,
  implants: [{ name: String, serial: String, manufacturer: String, cost: Number }],
  consumables: [consumableSchema],

  // Post-operative
  postOpOrders: String,
  recoveryBed: { type: mongoose.Schema.Types.ObjectId, ref: 'Bed' },
  recoveryNotes: String,
  painScore: Number,

  // Consent
  consentSigned: { type: Boolean, default: false },
  consentSignedAt: Date,
  consentSignedBy: String,

  // Billing
  otRoomCharges: { type: Number, default: 0 },
  surgeonFee: { type: Number, default: 0 },
  anesthetistFee: { type: Number, default: 0 },
  assistantFee: { type: Number, default: 0 },
  nursingCharges: { type: Number, default: 0 },
  equipmentCharges: { type: Number, default: 0 },
  consumableCharges: { type: Number, default: 0 },
  totalCharges: { type: Number, default: 0 },
  billed: { type: Boolean, default: false },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },

  // Meta
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  scheduledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String,
  priority: { type: Number, default: 0 } // for scheduling order
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Auto-generate surgery ID
surgerySchema.pre('save', async function(next) {
  if (!this.surgeryId) {
    const count = await mongoose.model('Surgery').countDocuments();
    this.surgeryId = `OT${String(count + 1).padStart(6, '0')}`;
  }
  // Calculate total charges
  const consumableTotal = (this.consumables || []).reduce((s, c) => s + (c.amount || 0), 0);
  const implantTotal = (this.implants || []).reduce((s, i) => s + (i.cost || 0), 0);
  this.consumableCharges = consumableTotal + implantTotal;
  this.totalCharges = (this.otRoomCharges || 0) + (this.surgeonFee || 0) +
    (this.anesthetistFee || 0) + (this.assistantFee || 0) +
    (this.nursingCharges || 0) + (this.equipmentCharges || 0) + this.consumableCharges;
  next();
});

surgerySchema.index({ patient: 1, status: 1 });
surgerySchema.index({ scheduledDate: 1, otRoom: 1 });
surgerySchema.index({ primarySurgeon: 1, scheduledDate: 1 });
surgerySchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Surgery', surgerySchema);
