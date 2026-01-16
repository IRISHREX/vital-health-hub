const mongoose = require('mongoose');

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
    required: true
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
appointmentSchema.pre('save', async function(next) {
  if (!this.appointmentId) {
    const count = await mongoose.model('Appointment').countDocuments();
    this.appointmentId = `APT${String(count + 1).padStart(6, '0')}`;
  }
  
  // Generate token number for the day
  if (!this.tokenNumber) {
    const startOfDay = new Date(this.appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(this.appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const todayCount = await mongoose.model('Appointment').countDocuments({
      doctor: this.doctor,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay }
    });
    this.tokenNumber = todayCount + 1;
  }
  next();
});

// Indexes for efficient queries
appointmentSchema.index({ doctor: 1, appointmentDate: 1 });
appointmentSchema.index({ patient: 1, appointmentDate: -1 });
appointmentSchema.index({ status: 1, appointmentDate: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
