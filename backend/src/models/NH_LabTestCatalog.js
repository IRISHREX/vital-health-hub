const mongoose = require('mongoose');

const catalogParameterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  unit: { type: String },
  normalRange: { type: String },
  method: String
}, { _id: true });

const labTestCatalogSchema = new mongoose.Schema({
  testName: {
    type: String,
    required: true,
    unique: true
  },
  testCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  category: {
    type: String,
    enum: ['hematology', 'biochemistry', 'microbiology', 'pathology', 'radiology', 'immunology', 'urine', 'serology', 'other'],
    required: true
  },
  description: String,
  sampleType: {
    type: String,
    enum: ['blood', 'urine', 'stool', 'sputum', 'csf', 'tissue', 'swab', 'other'],
    required: true
  },
  parameters: [catalogParameterSchema],
  price: {
    type: Number,
    required: true
  },
  turnaroundTime: {
    type: Number, // in hours
    default: 24
  },
  isActive: {
    type: Boolean,
    default: true
  },
  department: String,
  instructions: String // e.g. "Fasting required"
}, {
  timestamps: true
});

labTestCatalogSchema.index({ testName: 'text', testCode: 'text' });

module.exports = mongoose.model('LabTestCatalog', labTestCatalogSchema);
