const mongoose = require('mongoose');

const bedSchema = new mongoose.Schema({
  bedNumber: {
    type: String,
    required: true,
    unique: true
  },
  ward: {
    type: String,
    required: true
  },
  floor: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['general', 'semi_private', 'private', 'icu', 'nicu', 'picu', 'ccu', 'isolation'],
    default: 'general'
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'maintenance', 'reserved'],
    default: 'available'
  },
  pricePerDay: {
    type: Number,
    required: true,
    default: 500
  },
  currentPatient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient'
  },
  features: [String],
  facility: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Facility'
  }
}, {
  timestamps: true
});

bedSchema.index({ bedNumber: 1 });
bedSchema.index({ status: 1 });
bedSchema.index({ ward: 1 });

module.exports = mongoose.model('Bed', bedSchema);
