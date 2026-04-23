const mongoose = require('mongoose');

const formFieldSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['text', 'textarea', 'number', 'date', 'select', 'checkbox'],
      default: 'text'
    },
    required: { type: Boolean, default: false },
    options: [{ type: String }], // for select
    placeholder: { type: String, default: '' }
  },
  { _id: false }
);

const approvalRuleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    enabled: { type: Boolean, default: true },

    // Trigger: when does approval kick in?
    module: {
      type: String,
      required: true,
      enum: [
        'dashboard', 'beds', 'admissions', 'patients', 'doctors',
        'nurses', 'appointments', 'facilities', 'billing', 'reports',
        'notifications', 'settings', 'tasks', 'lab', 'pharmacy',
        'radiology', 'ot', 'invoices'
      ]
    },
    action: {
      type: String,
      required: true,
      enum: ['create', 'edit', 'delete', 'custom']
    },
    // Optional finer-grained label (e.g. "discharge", "refund")
    actionLabel: { type: String, default: '', trim: true },

    // Approver: by email OR by role
    approverType: {
      type: String,
      enum: ['email', 'role'],
      required: true
    },
    approverEmail: { type: String, lowercase: true, trim: true, default: '' },
    approverRole: { type: String, trim: true, default: '' },

    // Custom form fields
    formFields: [formFieldSchema],

    // SLA escalation
    slaHours: { type: Number, default: 24, min: 1 },
    escalationEmail: { type: String, lowercase: true, trim: true, default: '' },
    escalationRole: { type: String, trim: true, default: '' },

    // Behavior
    blocking: {
      type: String,
      enum: ['hard', 'soft'],
      default: 'hard'
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

approvalRuleSchema.index({ module: 1, action: 1, enabled: 1 });

module.exports = mongoose.model('ApprovalRule', approvalRuleSchema);
