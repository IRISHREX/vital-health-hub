const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctorId: {
    type: String,
    unique: true,
    required: true
  },
  specialization: {
    type: String,
    required: [true, 'Specialization is required']
  },
  department: {
    type: String,
    required: [true, 'Department is required']
  },
  qualification: {
    type: String,
    required: true
  },
  experience: {
    type: Number, // years
    default: 0
  },
  registrationNumber: {
    type: String,
    required: true
  },
  consultationFee: {
    opd: { type: Number, default: 500 },
    ipd: { type: Number, default: 1000 }
  },
  schedule: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    startTime: String,
    endTime: String,
    slotDuration: { type: Number, default: 30 }, // minutes
    maxPatients: { type: Number, default: 20 },
    isAvailable: { type: Boolean, default: true }
  }],
  availabilityStatus: {
    type: String,
    enum: ['available', 'busy', 'on_leave', 'unavailable'],
    default: 'available'
  },
  leaveSchedule: [{
    startDate: Date,
    endDate: Date,
    reason: String
  }],
  assignedWards: [String],
  specializations: [String], // Additional specializations
  languages: [String],
  bio: String,
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  totalReviews: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual to populate user details
doctorSchema.virtual('userDetails', {
  ref: 'User',
  localField: 'user',
  foreignField: '_id',
  justOne: true
});

// Auto-generate doctor ID
doctorSchema.pre('save', async function(next) {
  if (!this.doctorId) {
    const count = await mongoose.model('Doctor').countDocuments();
    this.doctorId = `DOC${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Doctor', doctorSchema);
