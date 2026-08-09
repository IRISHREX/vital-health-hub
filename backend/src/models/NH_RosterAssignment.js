const mongoose = require('mongoose');

const rosterAssignmentSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  employeeCode: { type: String, trim: true },
  employeeName: { type: String, trim: true },
  staffRole: { type: String, trim: true },
  // Local calendar day key (YYYY-MM-DD)
  date: { type: String, required: true, index: true },
  dateValue: { type: Date, required: true },
  shiftTemplate: { type: mongoose.Schema.Types.ObjectId, ref: 'ShiftTemplate' },
  shiftCode: { type: String, trim: true },
  shiftKind: {
    type: String,
    enum: ['morning', 'evening', 'night', 'split', 'on_call', 'standby'],
    default: 'morning',
  },
  unit: {
    type: String,
    enum: ['er', 'icu', 'ot', 'general_ward', 'opd', 'lab', 'radiology', 'pharmacy', 'admin'],
    default: 'general_ward',
  },
  plannedStart: { type: Date },
  plannedEnd: { type: Date },
  dutyType: {
    type: String,
    enum: ['regular', 'on_call', 'standby', 'emergency_callout'],
    default: 'regular',
  },
  status: {
    type: String,
    enum: ['planned', 'published', 'swapped', 'cancelled', 'completed'],
    default: 'planned',
  },
  attendance: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendance' },
  notes: { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

rosterAssignmentSchema.index({ employee: 1, date: 1 });
rosterAssignmentSchema.index({ date: 1, unit: 1 });

module.exports = mongoose.model('RosterAssignment', rosterAssignmentSchema);
