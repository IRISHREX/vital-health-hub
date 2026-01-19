const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true
  },
  specialization: {
    type: String,
    required: true
  },
  qualification: {
    type: String,
    required: true
  },
  experience: {
    type: Number,
    default: 0
  },
  consultationFee: {
    opd: {
      type: Number,
      default: 500
    },
    ipd: {
      type: Number,
      default: 1000
    }
  },
  availability: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    startTime: String,
    endTime: String
  }],
  availabilityStatus: {
    type: String,
    enum: ['available', 'busy', 'on_leave', 'off_duty'],
    default: 'available'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'on_leave'],
    default: 'active'
  },
  facility: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Facility'
  }
}, {
  timestamps: true
});

doctorSchema.index({ name: 1 });
doctorSchema.index({ specialization: 1 });
doctorSchema.index({ status: 1 });

module.exports = mongoose.model('Doctor', doctorSchema);
