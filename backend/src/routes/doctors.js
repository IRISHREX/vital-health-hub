const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/NH_doctorController');
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
  authorize('hospital_admin', 'super_admin'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required').custom(validatePhone),
  body('specialization').trim().notEmpty().withMessage('Specialization is required'),
  body('department').trim().notEmpty().withMessage('Department is required'),
  body('qualification').trim().notEmpty().withMessage('Qualification is required'),
  validate
], doctorController.createDoctor);

router.get('/', authenticate, doctorController.getDoctors);
router.get('/:id', authenticate, doctorController.getDoctor);
router.put('/:id', authenticate, authorize('hospital_admin', 'super_admin'), doctorController.updateDoctor);
router.patch('/:id/availability', authenticate, authorize('hospital_admin', 'super_admin', 'doctor'), doctorController.updateAvailability);
router.delete('/:id', authenticate, authorize('hospital_admin', 'super_admin'), doctorController.deleteDoctor);

module.exports = router;
