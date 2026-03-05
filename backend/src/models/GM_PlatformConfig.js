const mongoose = require('mongoose');

const platformConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  category: {
    type: String,
    enum: ['general', 'pricing', 'modules', 'notifications', 'security'],
    default: 'general'
  },
  description: String,
  updatedBy: String
}, {
  timestamps: true
});

module.exports = mongoose.model('GM_PlatformConfig', platformConfigSchema);
