const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/NH_appointmentController');
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

// Stats and special routes (must be before :id route)
router.get('/stats', authenticate, appointmentController.getAppointmentStats);
router.get('/today', authenticate, appointmentController.getTodayAppointments);
router.get('/schedule/:doctorId', authenticate, appointmentController.getDoctorSchedule);

router.post('/', [
  authenticate,
  authorize('receptionist', 'hospital_admin', 'super_admin'),
  body('patientId').isMongoId().withMessage('Valid patient ID is required'),
  body('doctorId').isMongoId().withMessage('Valid doctor ID is required'),
  body('appointmentDate').isISO8601().withMessage('Valid appointment date is required'),
  body('reason').trim().notEmpty().withMessage('Reason for appointment is required'),
  validate
], appointmentController.createAppointment);

router.get('/', authenticate, appointmentController.getAppointments);
router.get('/:id', authenticate, appointmentController.getAppointment);
router.put('/:id', authenticate, authorize('receptionist', 'doctor', 'hospital_admin', 'super_admin'), appointmentController.updateAppointment);
router.patch('/:id/status', authenticate, appointmentController.updateStatus);
router.post('/:id/cancel', authenticate, appointmentController.cancelAppointment);
router.delete('/:id', authenticate, authorize('receptionist', 'hospital_admin', 'super_admin'), appointmentController.deleteAppointment);

module.exports = router;
