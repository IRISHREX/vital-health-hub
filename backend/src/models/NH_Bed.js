const mongoose = require('mongoose');

const bedSchema = new mongoose.Schema({
  bedNumber: {
    type: String,
    required: [true, 'Bed number is required'],
    unique: true
  },
  bedType: {
    type: String,
    enum: ['icu', 'ccu', 'general', 'semi_private', 'private', 'emergency', 'ventilator', 'pediatric', 'maternity'],
    required: true
  },
  ward: {
    type: String,
    required: true
  },
  floor: {
    type: Number,
    required: true
  },
  roomNumber: {
    type: String
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'cleaning', 'reserved', 'maintenance', 'out_of_service'],
    default: 'available'
  },
  currentPatient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient'
  },
  currentAdmission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admission'
  },
  pricePerDay: {
    type: Number,
    required: true
  },
  amenities: [String],
  lastCleaned: {
    type: Date
  },
  lastOccupied: {
    type: Date
  },
  notes: String,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for quick status queries
bedSchema.index({ status: 1, bedType: 1 });
bedSchema.index({ ward: 1, floor: 1 });

module.exports = mongoose.model('Bed', bedSchema);
