const mongoose = require('mongoose');
const BaseScheduleEvent = require('../models/NH_ScheduleEvent');
const BaseDoctor = require('../models/NH_Doctor');
const BaseAppointment = require('../models/NH_Appointment');
const BaseNotification = require('../models/NH_Notification');
const BaseUser = require('../models/NH_User');
const { getModel } = require('../utils/tenantModel');
const { AppError } = require('../middleware/errorHandler');

const M = (req) => ({
  Event: getModel(req, 'ScheduleEvent', BaseScheduleEvent),
  Doctor: getModel(req, 'Doctor', BaseDoctor),
  Appointment: getModel(req, 'Appointment', BaseAppointment),
  Notification: getModel(req, 'Notification', BaseNotification),
  User: getModel(req, 'User', BaseUser),
});

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const ALLOWED_DURATIONS = [10, 20, 30];

const toMinutes = (hhmm) => {
  if (!hhmm || typeof hhmm !== 'string') return null;
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};
const fromMinutes = (mins) => {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};
const dateAt = (day, hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
};
const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const endOfDay   = (d) => { const x = new Date(d); x.setHours(23,59,59,999); return x; };

// Recurrence expansion (cheap: caller provides window)
function expandOccurrences(event, windowStart, windowEnd) {
  const r = event.recurrence;
  const baseStart = new Date(event.start);
  const baseEnd = new Date(event.end);
  const durationMs = baseEnd - baseStart;

  if (!r || r.freq === 'none' || !r.freq) {
    if (baseEnd < windowStart || baseStart > windowEnd) return [];
    return [event];
  }

  const occurrences = [];
  const limit = r.until ? new Date(r.until) : new Date(windowEnd);
  const hardCap = r.count || 200; // safety
  let cursor = new Date(baseStart);
  let i = 0;

  while (cursor <= limit && cursor <= windowEnd && i < hardCap) {
    const occStart = new Date(cursor);
    const occEnd = new Date(occStart.getTime() + durationMs);

    let include = false;
    if (r.freq === 'daily') include = true;
    else if (r.freq === 'weekly') {
      const days = (r.byWeekday && r.byWeekday.length) ? r.byWeekday : [baseStart.getDay()];
      include = days.includes(occStart.getDay());
    }

    if (include && occEnd >= windowStart) {
      occurrences.push({
        ...event.toObject(),
        _id: `${event._id}__${occStart.toISOString()}`,
        _occurrenceOf: event._id,
        start: occStart,
        end: occEnd,
      });
    }

    // advance cursor
    if (r.freq === 'daily') cursor.setDate(cursor.getDate() + (r.interval || 1));
    else if (r.freq === 'weekly') cursor.setDate(cursor.getDate() + 1); // walk day-by-day, filter by weekday
    else break;
    i++;
  }
  return occurrences;
}

// List events visible to user across a window
exports.listEvents = async (req, res, next) => {
  try {
    const { Event } = M(req);
    const from = req.query.from ? new Date(req.query.from) : startOfDay(new Date());
    const to   = req.query.to   ? new Date(req.query.to)   : endOfDay(new Date(Date.now() + 30 * 86400000));
    const userId = req.user._id;

    // Pull events that either intersect the window directly OR are recurring (we expand)
    const candidates = await Event.find({
      status: { $ne: 'cancelled' },
      $or: [
        { start: { $lte: to }, end: { $gte: from } },
        { 'recurrence.freq': { $in: ['daily', 'weekly'] } },
      ],
    })
      .populate('createdBy', 'name email role')
      .populate('attendees.user', 'name email role')
      .populate('doctor', 'name specialization')
      .populate('patient', 'name patientId')
      .lean({ virtuals: true })
      .limit(2000);

    // Re-fetch as docs to allow toObject in expander; cheaper: convert lean back manually
    const docs = await Event.find({
      _id: { $in: candidates.map(c => c._id) },
    })
      .populate('createdBy', 'name email role')
      .populate('attendees.user', 'name email role')
      .populate('doctor', 'name specialization')
      .populate('patient', 'name patientId');

    const expanded = [];
    for (const ev of docs) {
      expanded.push(...expandOccurrences(ev, from, to));
    }

    // Apply visibility: keep public/busy always; private only for creator/attendees
    const isMine = (ev) =>
      String(ev.createdBy?._id || ev.createdBy) === String(userId) ||
      (ev.attendees || []).some(a => String(a.user?._id || a.user) === String(userId));

    const visible = expanded
      .filter(ev => ev.visibility !== 'private' || isMine(ev))
      .map(ev => ev.visibility === 'private' && !isMine(ev)
        ? { ...ev, title: 'Busy', description: undefined, location: undefined }
        : ev);

    visible.sort((a, b) => new Date(a.start) - new Date(b.start));
    res.json({ success: true, data: visible });
  } catch (err) { next(err); }
};

// Create event
exports.createEvent = async (req, res, next) => {
  try {
    const { Event, Notification } = M(req);
    const payload = { ...req.body, createdBy: req.user._id };

    if (!payload.title || !payload.start || !payload.end) {
      throw new AppError('title, start and end are required', 400);
    }
    if (new Date(payload.end) <= new Date(payload.start)) {
      throw new AppError('End must be after start', 400);
    }

    // Normalise attendees
    if (Array.isArray(payload.attendees)) {
      payload.attendees = payload.attendees
        .filter(a => a && (a.user || typeof a === 'string'))
        .map(a => ({ user: a.user || a, status: 'invited' }));
    }

    const event = await Event.create(payload);

    // Notify attendees (best-effort, ignore failures)
    if (event.attendees?.length) {
      try {
        await Notification.insertMany(event.attendees.map(a => ({
          recipient: a.user,
          type: 'schedule_update',
          title: `Invited: ${event.title}`,
          message: `${req.user.name || 'Someone'} invited you to "${event.title}"`,
          priority: 'medium',
          data: { entityType: 'schedule_event', entityId: event._id, link: '/scheduler' },
        })));
      } catch (e) { /* ignore */ }
    }

    res.status(201).json({ success: true, data: event });
  } catch (err) { next(err); }
};

// Update event
exports.updateEvent = async (req, res, next) => {
  try {
    const { Event, Notification } = M(req);
    const event = await Event.findById(req.params.id);
    if (!event) throw new AppError('Event not found', 404);

    const isOwner = String(event.createdBy) === String(req.user._id);
    const isAdmin = ['super_admin', 'hospital_admin'].includes(req.user.role);
    if (!isOwner && !isAdmin) throw new AppError('Not allowed to edit this event', 403);

    const oldStart = event.start;
    Object.assign(event, req.body);
    if (Array.isArray(req.body.attendees)) {
      event.attendees = req.body.attendees.map(a => ({
        user: a.user || a,
        status: a.status || 'invited',
      }));
    }
    await event.save();

    if (oldStart && new Date(oldStart).getTime() !== new Date(event.start).getTime() && event.attendees?.length) {
      try {
        await Notification.insertMany(event.attendees.map(a => ({
          recipient: a.user,
          type: 'schedule_update',
          title: `Rescheduled: ${event.title}`,
          message: `"${event.title}" was moved to ${new Date(event.start).toLocaleString()}`,
          priority: 'medium',
          data: { entityType: 'schedule_event', entityId: event._id, link: '/scheduler' },
        })));
      } catch (e) { /* ignore */ }
    }

    res.json({ success: true, data: event });
  } catch (err) { next(err); }
};

// Delete (cancel)
exports.deleteEvent = async (req, res, next) => {
  try {
    const { Event, Notification } = M(req);
    const event = await Event.findById(req.params.id);
    if (!event) throw new AppError('Event not found', 404);

    const isOwner = String(event.createdBy) === String(req.user._id);
    const isAdmin = ['super_admin', 'hospital_admin'].includes(req.user.role);
    if (!isOwner && !isAdmin) throw new AppError('Not allowed', 403);

    if (event.attendees?.length) {
      try {
        await Notification.insertMany(event.attendees.map(a => ({
          recipient: a.user,
          type: 'appointment_cancelled',
          title: `Cancelled: ${event.title}`,
          message: `"${event.title}" was cancelled`,
          priority: 'medium',
          data: { entityType: 'schedule_event', entityId: event._id, link: '/scheduler' },
        })));
      } catch (e) { /* ignore */ }
    }

    await event.deleteOne();
    res.json({ success: true, message: 'Event removed' });
  } catch (err) { next(err); }
};

// Respond to invite (accept/decline/tentative)
exports.respondInvite = async (req, res, next) => {
  try {
    const { Event } = M(req);
    const { status } = req.body;
    if (!['accepted', 'declined', 'tentative'].includes(status)) {
      throw new AppError('Invalid status', 400);
    }
    const event = await Event.findById(req.params.id);
    if (!event) throw new AppError('Event not found', 404);
    const idx = (event.attendees || []).findIndex(a => String(a.user) === String(req.user._id));
    if (idx === -1) throw new AppError('You are not invited to this event', 403);
    event.attendees[idx].status = status;
    event.attendees[idx].respondedAt = new Date();
    await event.save();
    res.json({ success: true, data: event });
  } catch (err) { next(err); }
};

// Doctor slot generation for a given date
exports.getDoctorSlots = async (req, res, next) => {
  try {
    const { Doctor, Event, Appointment } = M(req);
    const { doctorId } = req.params;
    const dateParam = req.query.date ? new Date(req.query.date) : new Date();
    const duration = Number(req.query.duration) || 30;

    if (!ALLOWED_DURATIONS.includes(duration)) {
      throw new AppError(`Duration must be one of ${ALLOWED_DURATIONS.join(', ')} minutes`, 400);
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) throw new AppError('Doctor not found', 404);

    const dayName = DAY_NAMES[dateParam.getDay()];
    const todays = (doctor.schedule || []).filter(s => s.day === dayName && s.isAvailable !== false);

    if (!todays.length) {
      return res.json({ success: true, data: { slots: [], reason: 'Doctor not working this day' } });
    }

    // On leave?
    const onLeave = (doctor.leaveSchedule || []).some(l => {
      const s = new Date(l.startDate); const e = new Date(l.endDate);
      return dateParam >= startOfDay(s) && dateParam <= endOfDay(e);
    });
    if (onLeave) return res.json({ success: true, data: { slots: [], reason: 'Doctor on leave' } });

    // Build candidate slots
    const candidates = [];
    for (const win of todays) {
      const startMin = toMinutes(win.startTime);
      const endMin = toMinutes(win.endTime);
      if (startMin == null || endMin == null) continue;
      for (let m = startMin; m + duration <= endMin; m += duration) {
        candidates.push({
          start: dateAt(dateParam, fromMinutes(m)),
          end:   dateAt(dateParam, fromMinutes(m + duration)),
          startLabel: fromMinutes(m),
          endLabel: fromMinutes(m + duration),
        });
      }
    }

    // Pull busy periods: existing appointments + scheduler blocks/events involving this doctor
    const dayStart = startOfDay(dateParam);
    const dayEnd   = endOfDay(dateParam);

    const [appts, blocks] = await Promise.all([
      Appointment.find({
        doctor: doctorId,
        status: { $nin: ['cancelled', 'no_show'] },
        appointmentDate: { $gte: dayStart, $lte: dayEnd },
      }).select('appointmentDate timeSlot'),
      Event.find({
        status: { $ne: 'cancelled' },
        $or: [{ doctor: doctorId }, { 'attendees.user': doctor.user }],
        start: { $lte: dayEnd },
        end: { $gte: dayStart },
      }).select('start end kind'),
    ]);

    const busy = [];
    for (const a of appts) {
      busy.push({
        start: dateAt(a.appointmentDate, a.timeSlot.start),
        end:   dateAt(a.appointmentDate, a.timeSlot.end),
        type: 'appointment',
        label: 'Already booked',
      });
    }
    for (const b of blocks) {
      busy.push({
        start: new Date(b.start),
        end: new Date(b.end),
        type: b.kind === 'block' ? 'block' : b.kind || 'event',
        label: b.kind === 'block' ? 'Manually blocked' : `Busy (${b.kind})`,
      });
    }

    const now = new Date();
    const conflictFor = (slot) => busy.find(b => b.start < slot.end && b.end > slot.start);
    const slots = candidates.map(s => {
      if (s.end <= now) {
        return { ...s, available: false, reason: 'past', reasonLabel: 'Time has passed' };
      }
      const c = conflictFor(s);
      if (c) return { ...s, available: false, reason: c.type, reasonLabel: c.label };
      return { ...s, available: true };
    });

    res.json({ success: true, data: { duration, slots, allowedDurations: ALLOWED_DURATIONS } });
  } catch (err) { next(err); }
};

// Quick-book appointment from scheduler (creates Appointment + ScheduleEvent)
exports.bookAppointment = async (req, res, next) => {
  try {
    const { Doctor, Event, Appointment, Notification } = M(req);
    const { doctorId, patientId, date, startTime, duration = 30, reason, type = 'opd' } = req.body;

    if (!doctorId || !patientId || !date || !startTime) {
      throw new AppError('doctorId, patientId, date and startTime are required', 400);
    }
    if (!ALLOWED_DURATIONS.includes(Number(duration))) {
      throw new AppError(`Default durations are ${ALLOWED_DURATIONS.join(', ')} minutes. Use a manual block for longer.`, 400);
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) throw new AppError('Doctor not found', 404);

    const slotStart = dateAt(date, startTime);
    const slotEnd = new Date(slotStart.getTime() + Number(duration) * 60000);

    if (slotEnd <= new Date()) {
      throw new AppError('Cannot book a slot in the past', 400);
    }

    // Conflict check - calendar events / blocks
    const conflict = await Event.findOne({
      status: { $ne: 'cancelled' },
      $or: [{ doctor: doctorId }, { 'attendees.user': doctor.user }],
      start: { $lt: slotEnd },
      end: { $gt: slotStart },
    }).select('kind title start end');
    if (conflict) {
      const kindLabel = conflict.kind === 'block' ? 'a manual block' : `another ${conflict.kind}`;
      throw new AppError(
        `Slot overlaps with ${kindLabel} ("${conflict.title}") from ${new Date(conflict.start).toLocaleTimeString()} to ${new Date(conflict.end).toLocaleTimeString()}.`,
        409,
      );
    }

    // Conflict check - overlapping appointments (not just same start)
    const apptConflict = await Appointment.findOne({
      doctor: doctorId,
      status: { $nin: ['cancelled', 'no_show'] },
      appointmentDate: { $gte: startOfDay(slotStart), $lte: endOfDay(slotStart) },
    }).select('appointmentDate timeSlot patient').populate('patient', 'name');
    if (apptConflict?.timeSlot?.start && apptConflict?.timeSlot?.end) {
      const aStart = dateAt(apptConflict.appointmentDate, apptConflict.timeSlot.start);
      const aEnd   = dateAt(apptConflict.appointmentDate, apptConflict.timeSlot.end);
      if (aStart < slotEnd && aEnd > slotStart) {
        throw new AppError(
          `This doctor already has an appointment from ${apptConflict.timeSlot.start} to ${apptConflict.timeSlot.end}. Please pick another slot.`,
          409,
        );
      }
    }

    const appointment = await Appointment.create({
      patient: patientId,
      doctor: doctorId,
      appointmentDate: slotStart,
      timeSlot: {
        start: startTime,
        end: `${String(slotEnd.getHours()).padStart(2,'0')}:${String(slotEnd.getMinutes()).padStart(2,'0')}`,
      },
      type,
      reason,
      fee: doctor.consultationFee?.opd || 500,
      createdBy: req.user._id,
    });

    const event = await Event.create({
      kind: 'appointment',
      title: `Appointment • ${doctor.name || 'Doctor'}`,
      description: reason,
      start: slotStart,
      end: slotEnd,
      visibility: 'busy',
      createdBy: req.user._id,
      doctor: doctorId,
      patient: patientId,
      appointment: appointment._id,
      attendees: doctor.user ? [{ user: doctor.user, status: 'accepted' }] : [],
      color: '#2563eb',
    });

    if (doctor.user) {
      try {
        await Notification.create({
          recipient: doctor.user,
          type: 'appointment_scheduled',
          title: 'New appointment booked',
          message: `Appointment at ${startTime} on ${slotStart.toLocaleDateString()}`,
          data: { entityType: 'appointment', entityId: appointment._id, link: '/appointments' },
        });
      } catch (e) { /* ignore */ }
    }

    res.status(201).json({ success: true, data: { appointment, event } });
  } catch (err) { next(err); }
};

// Block calendar (manual block, any duration)
exports.createBlock = async (req, res, next) => {
  try {
    const { Event } = M(req);
    const { title = 'Blocked', start, end, attendees = [], doctor } = req.body;
    if (!start || !end) throw new AppError('start and end are required', 400);

    const event = await Event.create({
      kind: 'block',
      title,
      start, end,
      visibility: 'busy',
      createdBy: req.user._id,
      doctor: doctor || undefined,
      attendees: attendees.map(u => ({ user: u, status: 'accepted' })),
      color: '#ef4444',
    });
    res.status(201).json({ success: true, data: event });
  } catch (err) { next(err); }
};

exports.ALLOWED_DURATIONS = ALLOWED_DURATIONS;
