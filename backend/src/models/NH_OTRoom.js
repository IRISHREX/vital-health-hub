const mongoose = require('mongoose');

const otRoomSchema = new mongoose.Schema({
  roomNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['major', 'minor', 'cardiac', 'neuro', 'ortho', 'ophthalmic', 'ent', 'general'],
    default: 'general'
  },
  floor: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['available', 'in_use', 'maintenance', 'cleaning', 'reserved'],
    default: 'available'
  },
  equipment: [{
    name: String,
    quantity: { type: Number, default: 1 },
    status: { type: String, enum: ['working', 'faulty', 'under_maintenance'], default: 'working' }
  }],
  pricePerHour: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: String
}, {
  timestamps: true
});

module.exports = mongoose.model('OTRoom', otRoomSchema);
