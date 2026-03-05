const mongoose = require('mongoose');

// Sub-parameter template in catalog
const catalogSubParameterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  unit: { type: String },
  referenceRange: {
    type: mongoose.Schema.Types.Mixed,
    // e.g. { all: { min: 4000, max: 11000 } } or { male: { min: 12, max: 17 }, female: { min: 11.6, max: 15 }, child: { min: 14, max: 18 } }
    default: null
  },
  method: String
}, { _id: true });

// Parameter template in catalog
const catalogParameterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  unit: { type: String },
  referenceRange: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  method: String,
  subParameters: [catalogSubParameterSchema]
}, { _id: true });

// Test within a catalog section
const catalogTestSchema = new mongoose.Schema({
  testName: { type: String, required: true },
  testCode: { type: String },
  price: { type: Number, default: 0 },
  parameters: [catalogParameterSchema]
}, { _id: true });

// Section (top-level grouping like HAEMATOLOGY, BIOCHEMISTRY)
const catalogSectionSchema = new mongoose.Schema({
  sectionName: { type: String, required: true },
  tests: [catalogTestSchema]
}, { _id: true });

const labTestCatalogSchema = new mongoose.Schema({
  // Top-level catalog item name (what appears in search/selection)
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
  // New hierarchical structure: sections → tests → parameters → subParameters
  sections: [catalogSectionSchema],
  // Legacy flat parameters (kept for backward compat, prefer sections)
  parameters: [{
    name: { type: String, required: true },
    unit: { type: String },
    normalRange: { type: String },
    method: String
  }],
  price: {
    type: Number,
    required: true
  },
  turnaroundTime: {
    type: Number,
    default: 24
  },
  isActive: {
    type: Boolean,
    default: true
  },
  department: String,
  instructions: String
}, {
  timestamps: true
});

labTestCatalogSchema.index({ testName: 'text', testCode: 'text' });

module.exports = mongoose.model('LabTestCatalog', labTestCatalogSchema);
