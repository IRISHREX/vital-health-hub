const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const grandmasterUserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 8, select: false },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  role: { type: String, enum: ['grandmaster', 'platform_admin'], default: 'platform_admin' },
  phone: String,
  avatar: String,
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  passwordResetToken: String,
  passwordResetExpires: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

grandmasterUserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

grandmasterUserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, await bcrypt.genSalt(12));
  next();
});

grandmasterUserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('GM_GrandmasterUser', grandmasterUserSchema);
