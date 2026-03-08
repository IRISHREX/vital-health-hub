const mongoose = require('mongoose');

const serviceRuleSchema = new mongoose.Schema({
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceCatalog',
    required: true
  },
  billable: {
    type: Boolean,
    required: true
  },
  overridePrice: {
    type: Number,
    default: null
  },
  notes: String
}, { _id: true });

const roomTypeServiceSchema = new mongoose.Schema({
  roomType: {
    type: String,
    enum: ['icu', 'ccu', 'general', 'semi_private', 'private', 'emergency', 'ventilator', 'pediatric', 'maternity'],
    required: true,
    unique: true
  },
  displayName: {
    type: String,
    required: true
  },
  description: String,
  baseRate: {
    type: Number,
    default: 0
  },
  serviceRules: [serviceRuleSchema],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

roomTypeServiceSchema.index({ roomType: 1 }, { unique: true });

module.exports = mongoose.model('RoomTypeService', roomTypeServiceSchema);
