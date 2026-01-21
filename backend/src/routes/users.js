const express = require('express');
const router = express.Router();
const userController = require('../controllers/NH_userController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize('super_admin', 'hospital_admin'), userController.getUsers);
router.get('/:id', authenticate, authorize('super_admin', 'hospital_admin'), userController.getUser);
router.put('/:id', authenticate, authorize('super_admin', 'hospital_admin'), userController.updateUser);
router.delete('/:id', authenticate, authorize('super_admin'), userController.deleteUser);

module.exports = router;
