const express = require('express');
const router = express.Router();
const patientController = require('../controllers/NH_patientController');
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

router.post('/', [
  authenticate,
  authorize('receptionist', 'hospital_admin', 'super_admin'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('dateOfBirth').isISO8601().withMessage('Valid date of birth is required'),
  body('gender').isIn(['male', 'female', 'other']).withMessage('Gender must be male, female, or other'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  validate
], patientController.createPatient);

router.get('/', authenticate, patientController.getPatients);
router.get('/:id', authenticate, patientController.getPatient);
router.put('/:id', authenticate, authorize('doctor', 'hospital_admin', 'super_admin'), patientController.updatePatient);
router.delete('/:id', authenticate, authorize('hospital_admin', 'super_admin'), patientController.deletePatient);

module.exports = router;
