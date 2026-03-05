const mongoose = require('mongoose');

const facilitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Facility name is required'],
    unique: true
  },
  code: {
    type: String,
    unique: true,
    required: true
  },
  type: {
    type: String,
    enum: ['icu', 'lab', 'ot', 'pharmacy', 'radiology', 'ambulance', 'blood_bank', 'dialysis', 'physiotherapy', 'other'],
    required: true
  },
  description: String,
  location: {
    building: String,
    floor: Number,
    wing: String
  },
  capacity: Number,
  currentOccupancy: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['operational', 'under_maintenance', 'closed', 'limited'],
    default: 'operational'
  },
  operatingHours: {
    is24x7: { type: Boolean, default: false },
    schedule: [{
      day: String,
      openTime: String,
      closeTime: String
    }]
  },
  equipment: [{
    name: String,
    quantity: Number,
    status: { type: String, enum: ['working', 'under_repair', 'out_of_order'] }
  }],
  staff: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: String
  }],
  services: [{
    name: String,
    price: Number,
    duration: Number, // in minutes
    description: String
  }],
  contactNumber: String,
  email: String,
  inCharge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Auto-generate facility code
facilitySchema.pre('save', async function(next) {
  if (!this.code) {
    const prefix = this.type.substring(0, 3).toUpperCase();
    const count = await mongoose.model('Facility').countDocuments({ type: this.type });
    this.code = `${prefix}${String(count + 1).padStart(3, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Facility', facilitySchema);
