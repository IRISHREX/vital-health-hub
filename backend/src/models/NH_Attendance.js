const mongoose = require('mongoose');

const punchSchema = new mongoose.Schema({
  at: { type: Date },
  location: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceLocation' },
  locationName: { type: String, trim: true },
  method: { type: String, enum: ['qr_scan', 'id_card', 'manual'], default: 'qr_scan' },
  latitude: { type: Number },
  longitude: { type: Number },
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { _id: false });

const attendanceSchema = new mongoose.Schema({
  // `user` is the attendance subject key. For employees without a login account
  // the linked Employee id is used as the key so the (user, day) uniqueness and
  // all existing queries keep working.
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', index: true },
  employeeCode: { type: String, trim: true },
  userName: { type: String, trim: true },
  role: { type: String, trim: true },
  // Local calendar day key (YYYY-MM-DD) so one doc per employee per day.
  day: { type: String, required: true, index: true },
  checkIn: { type: punchSchema, default: undefined },
  checkOut: { type: punchSchema, default: undefined },
  totalMinutes: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['present', 'checked_in', 'absent', 'half_day', 'leave'],
    default: 'checked_in'
  },
  notes: { type: String, trim: true }
}, { timestamps: true });

attendanceSchema.index({ user: 1, day: 1 }, { unique: true });
attendanceSchema.index({ day: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
