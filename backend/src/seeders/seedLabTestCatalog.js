const mongoose = require('mongoose');
const connectDB = require('../config/database');
const LabTestCatalog = require('../models/NH_LabTestCatalog');

const buildCatalogTests = () => {
  return [
    {
      testName: 'Complete Blood Count (CBC)',
      testCode: 'CBC001',
      category: 'hematology',
      description: 'Complete Blood Count with Differential',
      sampleType: 'blood',
      price: 450,
      turnaroundTime: 6,
      isActive: true,
      department: 'Hematology',
      instructions: 'No special preparation required',
      sections: [
        {
          sectionName: 'HAEMATOLOGY',
          tests: [
            {
              testName: 'Complete Blood Count (CBC)',
              price: 450,
              parameters: [
                { name: 'Hemoglobin', unit: 'g/dl', referenceRange: { male: { min: 12.0, max: 17.0 }, female: { min: 11.6, max: 15.0 }, child: { min: 14.0, max: 18.0 } }, subParameters: [] },
                { name: 'Total WBC Count', unit: '/cmm', referenceRange: { all: { min: 4000, max: 11000 } }, subParameters: [] },
                { name: 'Total RBC Count', unit: 'mill/cmm', referenceRange: { all: { min: 4.3, max: 5.9 } }, subParameters: [] },
                {
                  name: 'Differential WBC Count', unit: null, referenceRange: null,
                  subParameters: [
                    { name: 'Polymorphs', unit: '%', referenceRange: { all: { min: 40, max: 70 } } },
                    { name: 'Lymphocytes', unit: '%', referenceRange: { all: { min: 20, max: 40 } } },
                    { name: 'Monocytes', unit: '%', referenceRange: { all: { min: 2, max: 8 } } },
                    { name: 'Eosinophils', unit: '%', referenceRange: { all: { min: 2, max: 6 } } },
                    { name: 'Basophils', unit: '%', referenceRange: { all: { min: 0, max: 2 } } }
                  ]
                },
                {
                  name: 'Platelet Count', unit: null, referenceRange: null,
                  subParameters: [
                    { name: 'Platelet Count', unit: '/Cmm', referenceRange: { all: { min: 150000, max: 400000 } } }
                  ]
                },
                {
                  name: 'Absolute Counts', unit: null, referenceRange: null,
                  subParameters: [
                    { name: 'Absolute Neutrophils', unit: '/cmm', referenceRange: { all: { min: 2500, max: 7000 } } },
                    { name: 'Absolute Lymphocyte', unit: '/cmm', referenceRange: { all: { min: 1000, max: 4000 } } }
                  ]
                },
                {
                  name: 'ESR', unit: null, referenceRange: null,
                  subParameters: [
                    { name: 'ESR', unit: '/Hour', referenceRange: { all: { min: 6, max: 18 } } }
                  ]
                },
                {
                  name: 'Blood Indices', unit: null, referenceRange: null,
                  subParameters: [
                    { name: 'P.C.V', unit: '%', referenceRange: { all: { min: 35.5, max: 38.6 } } },
                    { name: 'M.C.V.', unit: 'femtolitre', referenceRange: { all: { min: 80.0, max: 100.0 } } },
                    { name: 'M.C.H.', unit: 'pg', referenceRange: { all: { min: 27.0, max: 31.0 } } },
                    { name: 'M.C.H.C.', unit: 'g/dl', referenceRange: { all: { min: 31.0, max: 36.0 } } },
                    { name: 'R.D.W.', unit: '%', referenceRange: { all: { min: 12.0, max: 15.0 } } }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      testName: 'Lipid Profile',
      testCode: 'LPD001',
      category: 'biochemistry',
      description: 'Complete Lipid Panel',
      sampleType: 'blood',
      price: 600,
      turnaroundTime: 12,
      isActive: true,
      department: 'Biochemistry',
      instructions: 'Fasting required for 12 hours',
      sections: [
        {
          sectionName: 'BIOCHEMISTRY',
          tests: [
            {
              testName: 'Lipid Profile',
              price: 600,
              parameters: [
                { name: 'Total Cholesterol', unit: 'mg/dL', referenceRange: { all: { min: 0, max: 200 } }, subParameters: [] },
                { name: 'Triglycerides', unit: 'mg/dL', referenceRange: { all: { min: 0, max: 150 } }, subParameters: [] },
                { name: 'HDL Cholesterol', unit: 'mg/dL', referenceRange: { male: { min: 40, max: 60 }, female: { min: 50, max: 60 } }, subParameters: [] },
                { name: 'LDL Cholesterol', unit: 'mg/dL', referenceRange: { all: { min: 0, max: 100 } }, subParameters: [] },
                { name: 'VLDL Cholesterol', unit: 'mg/dL', referenceRange: { all: { min: 5, max: 40 } }, subParameters: [] },
                { name: 'Total/HDL Ratio', unit: '', referenceRange: { all: { min: 0, max: 5.0 } }, subParameters: [] }
              ]
            }
          ]
        }
      ]
    },
    {
      testName: 'Liver Function Test (LFT)',
      testCode: 'LFT001',
      category: 'biochemistry',
      description: 'Comprehensive Liver Function Panel',
      sampleType: 'blood',
      price: 750,
      turnaroundTime: 12,
      isActive: true,
      department: 'Biochemistry',
      instructions: 'Fasting for 8-10 hours recommended',
      sections: [
        {
          sectionName: 'BIOCHEMISTRY',
          tests: [
            {
              testName: 'Liver Function Test',
              price: 750,
              parameters: [
                { name: 'Total Bilirubin', unit: 'mg/dL', referenceRange: { all: { min: 0.1, max: 1.2 } }, subParameters: [] },
                { name: 'Direct Bilirubin', unit: 'mg/dL', referenceRange: { all: { min: 0.0, max: 0.3 } }, subParameters: [] },
                { name: 'Indirect Bilirubin', unit: 'mg/dL', referenceRange: { all: { min: 0.1, max: 0.9 } }, subParameters: [] },
                { name: 'SGOT (AST)', unit: 'U/L', referenceRange: { all: { min: 0, max: 40 } }, subParameters: [] },
                { name: 'SGPT (ALT)', unit: 'U/L', referenceRange: { all: { min: 0, max: 40 } }, subParameters: [] },
                { name: 'Alkaline Phosphatase', unit: 'U/L', referenceRange: { all: { min: 44, max: 147 } }, subParameters: [] },
                {
                  name: 'Proteins', unit: null, referenceRange: null,
                  subParameters: [
                    { name: 'Total Protein', unit: 'g/dL', referenceRange: { all: { min: 6.0, max: 8.3 } } },
                    { name: 'Albumin', unit: 'g/dL', referenceRange: { all: { min: 3.5, max: 5.5 } } },
                    { name: 'Globulin', unit: 'g/dL', referenceRange: { all: { min: 2.0, max: 3.5 } } },
                    { name: 'A/G Ratio', unit: '', referenceRange: { all: { min: 1.0, max: 2.0 } } }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      testName: 'Renal Function Test (RFT/KFT)',
      testCode: 'RFT001',
      category: 'biochemistry',
      description: 'Kidney Function Panel',
      sampleType: 'blood',
      price: 650,
      turnaroundTime: 12,
      isActive: true,
      department: 'Biochemistry',
      instructions: 'No special preparation',
      sections: [
        {
          sectionName: 'BIOCHEMISTRY',
          tests: [
            {
              testName: 'Renal Function Test',
              price: 650,
              parameters: [
                { name: 'Blood Urea', unit: 'mg/dL', referenceRange: { all: { min: 15, max: 45 } }, subParameters: [] },
                { name: 'Blood Urea Nitrogen', unit: 'mg/dL', referenceRange: { all: { min: 7, max: 21 } }, subParameters: [] },
                { name: 'Serum Creatinine', unit: 'mg/dL', referenceRange: { male: { min: 0.7, max: 1.3 }, female: { min: 0.6, max: 1.1 } }, subParameters: [] },
                { name: 'Serum Uric Acid', unit: 'mg/dL', referenceRange: { male: { min: 3.5, max: 7.2 }, female: { min: 2.6, max: 6.0 } }, subParameters: [] },
                {
                  name: 'Electrolytes', unit: null, referenceRange: null,
                  subParameters: [
                    { name: 'Sodium', unit: 'mEq/L', referenceRange: { all: { min: 136, max: 145 } } },
                    { name: 'Potassium', unit: 'mEq/L', referenceRange: { all: { min: 3.5, max: 5.1 } } },
                    { name: 'Chloride', unit: 'mEq/L', referenceRange: { all: { min: 98, max: 106 } } }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      testName: 'Thyroid Function Test (TFT)',
      testCode: 'TFT001',
      category: 'immunology',
      description: 'Thyroid Panel - T3, T4, TSH',
      sampleType: 'blood',
      price: 550,
      turnaroundTime: 24,
      isActive: true,
      department: 'Immunology',
      instructions: 'No special preparation',
      sections: [
        {
          sectionName: 'IMMUNOLOGY',
          tests: [
            {
              testName: 'Thyroid Function Test',
              price: 550,
              parameters: [
                { name: 'T3 (Triiodothyronine)', unit: 'ng/dL', referenceRange: { all: { min: 80, max: 200 } }, subParameters: [] },
                { name: 'T4 (Thyroxine)', unit: 'µg/dL', referenceRange: { all: { min: 5.1, max: 14.1 } }, subParameters: [] },
                { name: 'TSH', unit: 'µIU/mL', referenceRange: { all: { min: 0.27, max: 4.2 } }, subParameters: [] }
              ]
            }
          ]
        }
      ]
    },
    {
      testName: 'Fasting Blood Sugar',
      testCode: 'FBS001',
      category: 'biochemistry',
      description: 'Fasting Glucose Level',
      sampleType: 'blood',
      price: 100,
      turnaroundTime: 4,
      isActive: true,
      department: 'Biochemistry',
      instructions: 'Fasting for 8-12 hours required',
      sections: [
        {
          sectionName: 'BIOCHEMISTRY',
          tests: [
            {
              testName: 'Fasting Blood Sugar',
              price: 100,
              parameters: [
                { name: 'Fasting Blood Glucose', unit: 'mg/dL', referenceRange: { all: { min: 70, max: 110 } }, subParameters: [] }
              ]
            }
          ]
        }
      ]
    },
    {
      testName: 'HbA1c (Glycated Hemoglobin)',
      testCode: 'HBA001',
      category: 'biochemistry',
      description: 'Glycated Hemoglobin for Diabetes Monitoring',
      sampleType: 'blood',
      price: 400,
      turnaroundTime: 24,
      isActive: true,
      department: 'Biochemistry',
      instructions: 'No fasting required',
      sections: [
        {
          sectionName: 'BIOCHEMISTRY',
          tests: [
            {
              testName: 'HbA1c',
              price: 400,
              parameters: [
                { name: 'HbA1c', unit: '%', referenceRange: { all: { min: 4.0, max: 5.6 } }, subParameters: [] },
                { name: 'Estimated Average Glucose', unit: 'mg/dL', referenceRange: { all: { min: 68, max: 114 } }, subParameters: [] }
              ]
            }
          ]
        }
      ]
    },
    {
      testName: 'Urine Routine Examination',
      testCode: 'URE001',
      category: 'urine',
      description: 'Complete Urine Analysis',
      sampleType: 'urine',
      price: 200,
      turnaroundTime: 4,
      isActive: true,
      department: 'Urine Analysis',
      instructions: 'Midstream clean-catch sample',
      sections: [
        {
          sectionName: 'URINE ANALYSIS',
          tests: [
            {
              testName: 'Urine Routine Examination',
              price: 200,
              parameters: [
                {
                  name: 'Physical Examination', unit: null, referenceRange: null,
                  subParameters: [
                    { name: 'Color', unit: '', referenceRange: null },
                    { name: 'Appearance', unit: '', referenceRange: null },
                    { name: 'Specific Gravity', unit: '', referenceRange: { all: { min: 1.005, max: 1.030 } } },
                    { name: 'pH', unit: '', referenceRange: { all: { min: 4.6, max: 8.0 } } }
                  ]
                },
                {
                  name: 'Chemical Examination', unit: null, referenceRange: null,
                  subParameters: [
                    { name: 'Protein', unit: '', referenceRange: null },
                    { name: 'Glucose', unit: '', referenceRange: null },
                    { name: 'Ketone Bodies', unit: '', referenceRange: null },
                    { name: 'Blood', unit: '', referenceRange: null },
                    { name: 'Bilirubin', unit: '', referenceRange: null }
                  ]
                },
                {
                  name: 'Microscopic Examination', unit: null, referenceRange: null,
                  subParameters: [
                    { name: 'RBC', unit: '/HPF', referenceRange: { all: { min: 0, max: 2 } } },
                    { name: 'WBC (Pus Cells)', unit: '/HPF', referenceRange: { all: { min: 0, max: 5 } } },
                    { name: 'Epithelial Cells', unit: '/HPF', referenceRange: null },
                    { name: 'Casts', unit: '', referenceRange: null },
                    { name: 'Crystals', unit: '', referenceRange: null }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      testName: 'Widal Test',
      testCode: 'WDL001',
      category: 'serology',
      description: 'Typhoid Fever Screening',
      sampleType: 'blood',
      price: 250,
      turnaroundTime: 6,
      isActive: true,
      department: 'Serology',
      instructions: 'No special preparation',
      sections: [
        {
          sectionName: 'SEROLOGY',
          tests: [
            {
              testName: 'Widal Test',
              price: 250,
              parameters: [
                { name: 'S. Typhi O', unit: '', referenceRange: null, subParameters: [] },
                { name: 'S. Typhi H', unit: '', referenceRange: null, subParameters: [] },
                { name: 'S. Paratyphi AH', unit: '', referenceRange: null, subParameters: [] },
                { name: 'S. Paratyphi BH', unit: '', referenceRange: null, subParameters: [] }
              ]
            }
          ]
        }
      ]
    },
    {
      testName: 'C-Reactive Protein (CRP)',
      testCode: 'CRP001',
      category: 'immunology',
      description: 'Inflammation Marker',
      sampleType: 'blood',
      price: 350,
      turnaroundTime: 6,
      isActive: true,
      department: 'Immunology',
      instructions: 'No special preparation',
      sections: [
        {
          sectionName: 'IMMUNOLOGY',
          tests: [
            {
              testName: 'C-Reactive Protein',
              price: 350,
              parameters: [
                { name: 'CRP (Quantitative)', unit: 'mg/L', referenceRange: { all: { min: 0, max: 6 } }, subParameters: [] }
              ]
            }
          ]
        }
      ]
    }
  ];
};

const seedLabTestCatalog = async () => {
  try {
    await connectDB();
    const tests = buildCatalogTests();
    await LabTestCatalog.deleteMany({});
    await LabTestCatalog.insertMany(tests);
    console.log(`Seeded ${tests.length} lab test catalog entries with hierarchical structure.`);
    process.exit(0);
  } catch (error) {
    console.error('Lab test catalog seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
};

seedLabTestCatalog();
