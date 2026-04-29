const mongoose = require('mongoose');

/**
 * Global tenant-wide scheduling.
 * Kinds:
 *  - meeting    : multi-user gathering
 *  - block      : marks creator (and any attendees) as busy / unavailable
 *  - task       : an actionable scheduled work item
 *  - appointment: patient ↔ doctor consultation (also mirrored in NH_Appointment)
 *  - personal   : private to the creator
 */
const attendeeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['invited', 'accepted', 'declined', 'tentative'], default: 'invited' },
  respondedAt: Date,
}, { _id: false });

const recurrenceSchema = new mongoose.Schema({
  freq: { type: String, enum: ['none', 'daily', 'weekly'], default: 'none' },
  interval: { type: Number, default: 1, min: 1 },               // every N days/weeks
  byWeekday: [{ type: Number, min: 0, max: 6 }],                 // 0=Sun..6=Sat (weekly only)
  until: Date,                                                   // inclusive end of recurrence
  count: Number,                                                 // optional max occurrences
}, { _id: false });

const scheduleEventSchema = new mongoose.Schema({
  kind: {
    type: String,
    enum: ['meeting', 'block', 'task', 'appointment', 'personal'],
    default: 'meeting',
    required: true,
  },
  title: { type: String, required: true, trim: true },
  description: String,
  location: String,

  start: { type: Date, required: true },
  end:   { type: Date, required: true },
  allDay: { type: Boolean, default: false },

  // Visibility for non-attendees on the global calendar
  visibility: {
    type: String,
    enum: ['public', 'busy', 'private'],
    default: 'public',
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  attendees: [attendeeSchema],

  // Optional links to domain entities
  doctor:  { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },

  recurrence: { type: recurrenceSchema, default: () => ({ freq: 'none' }) },

  status: { type: String, enum: ['scheduled', 'cancelled', 'completed'], default: 'scheduled' },
  color: String,
}, { timestamps: true });

scheduleEventSchema.index({ start: 1, end: 1 });
scheduleEventSchema.index({ createdBy: 1, start: 1 });
scheduleEventSchema.index({ 'attendees.user': 1, start: 1 });
scheduleEventSchema.index({ doctor: 1, start: 1 });

module.exports = mongoose.model('ScheduleEvent', scheduleEventSchema);
