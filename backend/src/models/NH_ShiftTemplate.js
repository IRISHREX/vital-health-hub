const mongoose = require('mongoose');

const shiftTemplateSchema = new mongoose.Schema({
  code: { type: String, required: true, trim: true, uppercase: true },
  name: { type: String, required: true, trim: true },
  kind: {
    type: String,
    enum: ['morning', 'evening', 'night', 'split', 'on_call', 'standby'],
    default: 'morning',
  },
  startTime: { type: String, required: true, trim: true }, // "HH:mm"
  endTime: { type: String, required: true, trim: true }, // "HH:mm"
  breakMinutes: { type: Number, default: 0, min: 0 },
  crossesMidnight: { type: Boolean, default: false },
  unit: {
    type: String,
    enum: ['er', 'icu', 'ot', 'general_ward', 'opd', 'lab', 'radiology', 'pharmacy', 'admin'],
    default: 'general_ward',
  },
  nightDifferentialPercent: { type: Number, default: 0, min: 0 },
  hazardAllowance: { type: Number, default: 0, min: 0 },
  minRestHoursAfter: { type: Number, default: 11, min: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

shiftTemplateSchema.index({ code: 1 }, { unique: true });

module.exports = mongoose.model('ShiftTemplate', shiftTemplateSchema);
