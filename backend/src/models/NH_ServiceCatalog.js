const mongoose = require('mongoose');

const serviceCatalogSchema = new mongoose.Schema({
  serviceId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: [true, 'Service name is required']
  },
  category: {
    type: String,
    enum: [
      'room_utility', 'patient_support', 'consumable', 'room_amenity',
      'administrative', 'medical', 'diagnostic', 'medication',
      'room_billable', 'food_misc', 'nursing', 'physiotherapy', 'other'
    ],
    required: true
  },
  subcategory: String,
  description: String,
  defaultBillable: {
    type: Boolean,
    default: true
  },
  defaultPrice: {
    type: Number,
    default: 0
  },
  unit: {
    type: String,
    enum: ['per_day', 'per_hour', 'per_session', 'per_use', 'flat', 'per_unit'],
    default: 'per_use'
  },
  taxable: {
    type: Boolean,
    default: false
  },
  taxPercent: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [String]
}, {
  timestamps: true
});

// Auto-generate serviceId
serviceCatalogSchema.pre('validate', async function (next) {
  if (!this.serviceId) {
    const prefix = this.category ? this.category.substring(0, 3).toUpperCase() : 'SRV';
    const count = await mongoose.model('ServiceCatalog').countDocuments();
    this.serviceId = `SRV-${prefix}${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

serviceCatalogSchema.index({ category: 1, isActive: 1 });
serviceCatalogSchema.index({ serviceId: 1 }, { unique: true });
serviceCatalogSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('ServiceCatalog', serviceCatalogSchema);
