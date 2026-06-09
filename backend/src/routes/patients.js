const express = require('express');
const router = express.Router();
const patientController = require('../controllers/NH_patientController');
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

// Custom phone validation function
const validatePhone = (value) => {
  const digitsOnly = value.replace(/\D/g, '');
  if (digitsOnly.length !== 10) {
    throw new Error('Phone number must contain exactly 10 digits');
  }
  return true;
};

router.post('/', [
  authenticate,
  authorize('receptionist', 'hospital_admin', 'super_admin'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').optional({ checkFalsy: true }).trim(),
  body('dateOfBirth').optional({ checkFalsy: true }).isISO8601().withMessage('Valid date of birth required if provided'),
  body('gender').optional({ checkFalsy: true }).isIn(['male', 'female', 'other']).withMessage('Gender must be male, female, or other'),
  body('phone').optional({ checkFalsy: true }).trim().custom((value) => {
    if (!value) return true;
    return validatePhone(value);
  }),
  validate
], patientController.createPatient);

router.get('/', authenticate, patientController.getPatients);
router.get('/:id/history', authenticate, patientController.getPatientHistory);
router.get('/:id', authenticate, patientController.getPatient);
router.put('/:id', authenticate, authorize('doctor', 'hospital_admin', 'super_admin', 'nurse'), patientController.updatePatient);
router.delete('/:id', authenticate, authorize('hospital_admin', 'super_admin'), patientController.deletePatient);

module.exports = router;
