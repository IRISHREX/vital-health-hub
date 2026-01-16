const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('./index');
const User = require('../models/User');

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: config.frontendUrls,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await User.findById(decoded.id);
      
      if (!user || !user.isActive) {
        return next(new Error('User not found or inactive'));
      }

      socket.user = user;
      socket.join(`user:${user._id}`);
      socket.join(`role:${user.role}`);
      
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.user.email} (${socket.user.role})`);

    // Join department room if applicable
    if (socket.user.department) {
      socket.join(`department:${socket.user.department}`);
    }

    // Handle bed status updates
    socket.on('bed:subscribe', () => {
      socket.join('beds');
      console.log(`👁️ ${socket.user.email} subscribed to bed updates`);
    });

    // Handle patient updates
    socket.on('patient:subscribe', () => {
      socket.join('patients');
    });

    // Handle notifications
    socket.on('notification:read', async (notificationId) => {
      // Emit back confirmation
      socket.emit('notification:updated', { id: notificationId, read: true });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${socket.user.email}`);
    });
  });

  return io;
};

// Emit functions for real-time updates
const emitBedUpdate = (bed) => {
  if (io) {
    io.to('beds').emit('bed:updated', bed);
  }
};

const emitPatientUpdate = (patient) => {
  if (io) {
    io.to('patients').emit('patient:updated', patient);
  }
};

const emitNotification = (userId, notification) => {
  if (io) {
    io.to(`user:${userId}`).emit('notification:new', notification);
  }
};

const emitToRole = (role, event, data) => {
  if (io) {
    io.to(`role:${role}`).emit(event, data);
  }
};

const emitToDepartment = (department, event, data) => {
  if (io) {
    io.to(`department:${department}`).emit(event, data);
  }
};

module.exports = {
  initializeSocket,
  emitBedUpdate,
  emitPatientUpdate,
  emitNotification,
  emitToRole,
  emitToDepartment,
  getIO: () => io
};
