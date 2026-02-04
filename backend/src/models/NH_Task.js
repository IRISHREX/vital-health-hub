const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String },
  type: { type: String, enum: ['general', 'vitals', 'medication', 'procedure', 'custom'], default: 'general' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: { type: String, enum: ['pending', 'in-progress', 'completed', 'overdue'], default: 'pending' },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  room: { type: String },
  dueDate: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  completedAt: { type: Date },
  notes: { type: String }
}, {
  timestamps: true
});

module.exports = mongoose.model('Task', taskSchema);
