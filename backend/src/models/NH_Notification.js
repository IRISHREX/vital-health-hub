const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'bed_available', 'bed_assigned', 'bed_released',
      'patient_admitted', 'patient_discharged',
      'appointment_scheduled', 'appointment_reminder', 'appointment_cancelled',
      'invoice_generated', 'payment_received', 'payment_overdue',
      'schedule_update', 'leave_approved',
      'system', 'alert', 'info'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  data: {
    entityType: String, // 'bed', 'patient', 'appointment', etc.
    entityId: mongoose.Schema.Types.ObjectId,
    link: String
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: Date
}, {
  timestamps: true
});

// Indexes for quick queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
