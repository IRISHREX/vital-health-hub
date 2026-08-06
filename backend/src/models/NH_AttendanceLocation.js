const mongoose = require('mongoose');
const crypto = require('crypto');

const attendanceLocationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, trim: true },
  // Token embedded in the printed QR poster. Rotatable.
  token: { type: String, required: true, unique: true, index: true },
  description: { type: String, trim: true },
  latitude: { type: Number },
  longitude: { type: Number },
  radiusMeters: { type: Number, default: 150 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

attendanceLocationSchema.statics.generateToken = () => crypto.randomBytes(16).toString('hex');

module.exports = mongoose.model('AttendanceLocation', attendanceLocationSchema);
