const mongoose = require('mongoose');
const connectDB = require('../config/database');
const LabTestCatalog = require('../models/NH_LabTestCatalog');

const CATEGORY_CONFIG = [
  { key: 'hematology', sampleType: 'blood', department: 'Hematology' },
  { key: 'biochemistry', sampleType: 'blood', department: 'Biochemistry' },
  { key: 'microbiology', sampleType: 'swab', department: 'Microbiology' },
  { key: 'pathology', sampleType: 'tissue', department: 'Pathology' },
  { key: 'radiology', sampleType: 'other', department: 'Radiology' },
  { key: 'immunology', sampleType: 'blood', department: 'Immunology' },
  { key: 'urine', sampleType: 'urine', department: 'Urine Analysis' },
  { key: 'serology', sampleType: 'blood', department: 'Serology' },
  { key: 'other', sampleType: 'other', department: 'General Lab' }
];

const BASE_TEST_NAMES = [
  'Complete Blood Count',
  'Liver Function Panel',
  'Renal Function Panel',
  'Lipid Profile',
  'Thyroid Function Test',
  'Electrolyte Panel',
  'Fasting Blood Sugar',
  'HbA1c',
  'C-Reactive Protein',
  'Prothrombin Time',
  'Activated Partial Thromboplastin Time'
];

const buildParameters = (category, index) => {
  const order = index + 1;
  if (category === 'hematology') {
    return [
      { name: `Hemoglobin ${order}`, unit: 'g/dL', normalRange: '13-17', method: 'Automated Analyzer' },
      { name: `WBC ${order}`, unit: '10^3/uL', normalRange: '4-11', method: 'Automated Analyzer' }
    ];
  }

  if (category === 'biochemistry') {
    return [
      { name: `Glucose ${order}`, unit: 'mg/dL', normalRange: '70-110', method: 'Enzymatic' },
      { name: `Creatinine ${order}`, unit: 'mg/dL', normalRange: '0.7-1.3', method: 'Jaffe' }
    ];
  }

  if (category === 'urine') {
    return [
      { name: `Protein ${order}`, unit: 'mg/dL', normalRange: 'Negative', method: 'Dipstick' },
      { name: `Glucose ${order}`, unit: 'mg/dL', normalRange: 'Negative', method: 'Dipstick' }
    ];
  }

  return [
    { name: `Result ${order}`, unit: '', normalRange: 'As per lab reference', method: 'Standard Method' }
  ];
};

const buildCatalogTests = (count = 99) => {
  const tests = [];

  for (let i = 0; i < count; i += 1) {
    const categoryInfo = CATEGORY_CONFIG[i % CATEGORY_CONFIG.length];
    const baseName = BASE_TEST_NAMES[i % BASE_TEST_NAMES.length];
    const serial = String(i + 1).padStart(3, '0');
    const turnaroundTime = categoryInfo.key === 'radiology' ? 12 : 24;
    const price = 150 + ((i * 37) % 850);

    tests.push({
      testName: `${baseName} ${serial}`,
      testCode: `LTC${serial}`,
      category: categoryInfo.key,
      description: `${baseName} (${categoryInfo.department})`,
      sampleType: categoryInfo.sampleType,
      parameters: buildParameters(categoryInfo.key, i),
      price,
      turnaroundTime,
      isActive: true,
      department: categoryInfo.department,
      instructions: i % 4 === 0 ? 'Fasting required for 8 hours' : 'No special preparation'
    });
  }

  return tests;
};

const seedLabTestCatalog = async () => {
  try {
    await connectDB();

    const tests = buildCatalogTests(99);

    await LabTestCatalog.deleteMany({});
    await LabTestCatalog.insertMany(tests);

    console.log(`Seeded ${tests.length} lab test catalog entries.`);
    process.exit(0);
  } catch (error) {
    console.error('Lab test catalog seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
};

seedLabTestCatalog();
