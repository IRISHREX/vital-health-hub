const express = require('express');
const router = express.Router();
const taskController = require('../controllers/NH_taskController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, authorize('hospital_admin','super_admin','doctor'), taskController.createTask);
router.get('/', authenticate, authorize('hospital_admin','super_admin','doctor'), taskController.getTasks);
router.get('/my', authenticate, taskController.getMyTasks);
router.get('/:id', authenticate, taskController.getTask);
router.put('/:id', authenticate, authorize('hospital_admin','super_admin'), taskController.updateTask);
router.put('/:id/complete', authenticate, taskController.completeTask);
router.delete('/:id', authenticate, authorize('hospital_admin','super_admin'), taskController.deleteTask);

module.exports = router;