const mongoose = require('mongoose');
const { getNextSequenceValue } = require('../utils/sequenceGenerator');

const appointmentSchema = new mongoose.Schema({
  appointmentId: {
    type: String,
    unique: true,
    required: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
  },
  // Optional nurse assigned to assist this appointment
  assignedNurse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  appointmentDate: {
    type: Date,
    required: true
  },
  timeSlot: {
    start: { type: String, required: true },
    end: { type: String, required: true }
  },
  type: {
    type: String,
    enum: ['opd', 'follow_up', 'consultation', 'emergency', 'telemedicine'],
    default: 'opd'
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'],
    default: 'scheduled'
  },
  priority: {
    type: String,
    enum: ['normal', 'urgent', 'emergency'],
    default: 'normal'
  },
  reason: String,
  symptoms: [String],
  notes: String,
  consultationNotes: String,
  prescription: String,
  followUpDate: Date,
  fee: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'waived'],
    default: 'pending'
  },
  paymentMode: {
    type: String,
    enum: ['cash', 'card', 'upi', 'net_banking', 'cheque', 'insurance', 'pending'],
    default: 'pending'
  },
  referredBy: {
    name: { type: String, default: '' },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  },
  cancelledReason: String,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  tokenNumber: Number
}, {
  timestamps: true
});

// Auto-generate appointment ID and token
// Run this before validation so required validators see the generated values
appointmentSchema.pre('validate', async function(next) {
  try {
    if (!this.appointmentId) {
      this.appointmentId = await getNextSequenceValue('appointmentId', 'APT');
    }

    // Generate a per-doctor per-date token number.
    // - Scoped by doctor + calendar date (YYYY-MM-DD) so tokens reset daily per doctor.
    // - Uses an atomic counter to avoid race conditions on concurrent bookings.
    // - Falls back to (max token + 1) for the (doctor, date) window if the counter
    //   is behind (e.g. legacy data inserted before this logic existed).
    if (!this.tokenNumber && this.appointmentDate && this.doctor) {
      const d = new Date(this.appointmentDate);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const counterKey = `appointmentToken:${this.doctor}:${dateKey}`;

      // IMPORTANT: use the same connection this document is bound to so that
      // multi-tenant deployments hit the correct tenant DB (not the default
      // mongoose connection).
      const conn = this.constructor.db;
      const CounterModel = require('./Counter');
      const Counter = conn.models.Counter || conn.model('Counter', CounterModel.schema);
      const Appointment = this.constructor;

      const startOfDay = new Date(d); startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(d); endOfDay.setHours(23, 59, 59, 999);

      // Find the highest existing active token for this doctor+date (excluding
      // cancelled/no_show so reclaimed slots don't leave gaps growing forever,
      // but we still take the max to never collide with an existing record).
      const highest = await Appointment.findOne({
        doctor: this.doctor,
        appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      })
        .sort({ tokenNumber: -1 })
        .select('tokenNumber')
        .lean();
      const existingMax = highest?.tokenNumber || 0;

      // Atomically increment the per-(doctor,date) counter
      const counter = await Counter.findByIdAndUpdate(
        counterKey,
        { $inc: { sequence_value: 1 } },
        { new: true, upsert: true }
      );

      // Reconcile: if counter is behind real data, bump it forward atomically.
      let token = counter.sequence_value;
      if (token <= existingMax) {
        const reconciled = await Counter.findByIdAndUpdate(
          counterKey,
          { $set: { sequence_value: existingMax + 1 } },
          { new: true }
        );
        token = reconciled.sequence_value;
      }

      this.tokenNumber = token;
    }
    next();
  } catch (err) {
    next(err);
  }
});

// Indexes for efficient queries
appointmentSchema.index({ doctor: 1, appointmentDate: 1 });
appointmentSchema.index({ patient: 1, appointmentDate: -1 });
appointmentSchema.index({ status: 1, appointmentDate: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
