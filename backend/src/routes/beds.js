const express = require('express');
const router = express.Router();
const bedController = require('../controllers/NH_bedController');
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

// Stats route (must be before :id route)
router.get('/stats', authenticate, bedController.getBedStats);

router.post('/', [
  authenticate,
  authorize('hospital_admin', 'super_admin'),
  body('bedNumber').trim().notEmpty().withMessage('Bed number is required'),
  body('bedType').isIn(['icu', 'ccu', 'general', 'semi_private', 'private', 'emergency', 'ventilator', 'pediatric', 'maternity']).withMessage('Valid bed type is required'),
  body('ward').trim().notEmpty().withMessage('Ward is required'),
  body('floor').isInt({ min: 0 }).withMessage('Floor must be a valid number'),
  body('pricePerDay').isFloat({ min: 0 }).withMessage('Price per day must be a positive number'),
  validate
], bedController.createBed);

router.get('/', authenticate, bedController.getBeds);
router.get('/:id', authenticate, bedController.getBed);
// Assign a nurse in charge of this bed/room
router.patch('/:id/assign-nurse', authenticate, authorize('hospital_admin', 'super_admin', 'doctor', 'head_nurse', 'nurse'), bedController.assignNurse);
router.put('/:id', authenticate, authorize('hospital_admin', 'super_admin'), bedController.updateBed);
router.patch('/:id/status', authenticate, bedController.updateBedStatus);
router.post('/:id/assign', authenticate, bedController.assignBed);
router.post('/:id/release', authenticate, bedController.releaseBed);
router.delete('/:id', authenticate, authorize('hospital_admin', 'super_admin'), bedController.deleteBed);

module.exports = router;
