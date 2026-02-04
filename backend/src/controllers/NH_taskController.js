const { Task, Patient, User, Notification } = require('../models');
const { AppError } = require('../middleware/errorHandler');

// @desc Create task (Admin/Doctor)
// @route POST /api/tasks
// @access Admin/Doctor
exports.createTask = async (req, res, next) => {
  try {
    const { title, description, type, priority, patient, assignedTo, dueDate, room } = req.body;

    if (!title) throw new AppError('Title is required', 400);

    const task = await Task.create({
      title,
      description,
      type,
      priority,
      patient: patient || null,
      assignedTo: assignedTo || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      room: room || null,
      createdBy: req.user._id
    });

    // Create notification for assigned user
    if (assignedTo) {
      try {
        await Notification.create({
          user: assignedTo,
          type: 'task_assigned',
          message: `New task assigned: ${title}`,
          data: { taskId: task._id }
        });
      } catch (nErr) {
        console.error('Failed to create notification for task assignment', nErr);
      }
    }

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

// @desc Get tasks (Admin)
// @route GET /api/tasks
// @access Admin
exports.getTasks = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, assignedTo } = req.query;
    const query = {};
    if (status) query.status = status;
    if (assignedTo) query.assignedTo = assignedTo;

    const total = await Task.countDocuments(query);
    const tasks = await Task.find(query)
      .populate('patient', 'firstName lastName patientId')
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({ success: true, data: { tasks, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } } });
  } catch (error) {
    next(error);
  }
};

// @desc Get my tasks (assigned to me)
// @route GET /api/tasks/my
// @access Private
exports.getMyTasks = async (req, res, next) => {
  try {
    const tasks = await Task.find({ assignedTo: req.user._id }).populate('patient', 'firstName lastName patientId');
    res.json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
};

// @desc Get single task
// @route GET /api/tasks/:id
// @access Private (assigned user or admin)
exports.getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('patient', 'firstName lastName patientId')
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName');
    if (!task) throw new AppError('Task not found', 404);

    // Only assigned or admin can view
    if (task.assignedTo && task.assignedTo._id && task.assignedTo._id.toString() !== req.user._id.toString() && !['super_admin','hospital_admin'].includes(req.user.role)) {
      throw new AppError('Unauthorized', 403);
    }

    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

// @desc Update a task
// @route PUT /api/tasks/:id
// @access Admin or creator
exports.updateTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) throw new AppError('Task not found', 404);

    // Only admins/hospital_admin or creator can update
    if (!req.user || (!['super_admin', 'hospital_admin'].includes(req.user.role) && task.createdBy.toString() !== req.user._id.toString())) {
      throw new AppError('Unauthorized', 403);
    }

    const allowed = ['title','description','type','priority','patient','assignedTo','dueDate','room','status','notes'];
    allowed.forEach(key => {
      if (req.body[key] !== undefined) task[key] = req.body[key];
    });

    await task.save();

    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

// @desc Complete task
// @route PUT /api/tasks/:id/complete
// @access Assigned user or admin
exports.completeTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) throw new AppError('Task not found', 404);

    // Only assigned user or admin can complete
    if (task.assignedTo && task.assignedTo.toString() !== req.user._id.toString() && !['super_admin', 'hospital_admin'].includes(req.user.role)) {
      throw new AppError('Unauthorized', 403);
    }

    task.status = 'completed';
    task.completedBy = req.user._id;
    task.completedAt = new Date();
    await task.save();

    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

// @desc Delete a task
// @route DELETE /api/tasks/:id
// @access Admin
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) throw new AppError('Task not found', 404);

    await task.remove();

    res.json({ success: true, message: 'Task removed' });
  } catch (error) {
    next(error);
  }
};
