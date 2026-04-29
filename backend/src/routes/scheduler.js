const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/NH_schedulerController');

const router = express.Router();

router.use(authenticate);

// Anyone can read the global calendar
router.get('/events', ctrl.listEvents);
router.get('/doctors/:doctorId/slots', ctrl.getDoctorSlots);

// Booking / creation — role-gated
const canBook = authorize('super_admin', 'hospital_admin', 'doctor', 'receptionist', 'head_nurse', 'nurse');

router.post('/events', canBook, ctrl.createEvent);
router.post('/blocks', canBook, ctrl.createBlock);
router.post('/appointments', authorize('super_admin', 'hospital_admin', 'doctor', 'receptionist'), ctrl.bookAppointment);

router.put('/events/:id', canBook, ctrl.updateEvent);
router.delete('/events/:id', canBook, ctrl.deleteEvent);
router.post('/events/:id/respond', ctrl.respondInvite);

module.exports = router;
