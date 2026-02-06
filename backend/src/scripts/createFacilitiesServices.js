const { Facility } = require('../models');

const facilities = [
  {
    name: 'Intensive Care Unit',
    code: 'ICU001',
    type: 'icu',
    description: 'Critical care unit for intensive monitoring',
    location: { building: 'Main', floor: 2, wing: 'A' },
    capacity: 12,
    status: 'operational',
    operatingHours: { is24x7: true },
    services: [
      { name: 'ICU Bed Charges', price: 5000, duration: 1440, description: 'Per day ICU bed charges' },
      { name: 'Ventilator Support', price: 2500, duration: 1440, description: 'Per day ventilator support' },
    ],
    contactNumber: '+91 98765 11111',
    email: 'icu@hospital.com'
  },
  {
    name: 'Clinical Laboratory',
    code: 'LAB001',
    type: 'lab',
    description: 'Diagnostics and pathology lab',
    location: { building: 'Main', floor: 1, wing: 'B' },
    capacity: 20,
    status: 'operational',
    operatingHours: {
      is24x7: false,
      schedule: [
        { day: 'monday', openTime: '08:00', closeTime: '20:00' },
        { day: 'tuesday', openTime: '08:00', closeTime: '20:00' },
        { day: 'wednesday', openTime: '08:00', closeTime: '20:00' },
        { day: 'thursday', openTime: '08:00', closeTime: '20:00' },
        { day: 'friday', openTime: '08:00', closeTime: '20:00' },
        { day: 'saturday', openTime: '08:00', closeTime: '16:00' }
      ]
    },
    services: [
      { name: 'CBC', price: 400, duration: 30, description: 'Complete blood count' },
      { name: 'LFT', price: 650, duration: 45, description: 'Liver function test' },
      { name: 'RFT', price: 650, duration: 45, description: 'Renal function test' },
    ],
    contactNumber: '+91 98765 22222',
    email: 'lab@hospital.com'
  },
  {
    name: 'Radiology Department',
    code: 'RAD001',
    type: 'radiology',
    description: 'Imaging and diagnostic radiology',
    location: { building: 'Main', floor: 1, wing: 'C' },
    capacity: 10,
    status: 'operational',
    operatingHours: { is24x7: false },
    services: [
      { name: 'X-Ray', price: 500, duration: 20, description: 'Basic X-ray imaging' },
      { name: 'Ultrasound', price: 900, duration: 30, description: 'Ultrasound scan' },
      { name: 'CT Scan', price: 3500, duration: 60, description: 'CT scan imaging' },
    ],
    contactNumber: '+91 98765 33333',
    email: 'radiology@hospital.com'
  },
  {
    name: 'Operation Theatre',
    code: 'OT001',
    type: 'ot',
    description: 'Surgical operation theatre',
    location: { building: 'Main', floor: 3, wing: 'A' },
    capacity: 4,
    status: 'operational',
    operatingHours: { is24x7: true },
    services: [
      { name: 'Minor Surgery', price: 8000, duration: 90, description: 'Minor surgical procedures' },
      { name: 'Major Surgery', price: 25000, duration: 180, description: 'Major surgical procedures' },
    ],
    contactNumber: '+91 98765 44444',
    email: 'ot@hospital.com'
  },
  {
    name: 'Pharmacy',
    code: 'PHR001',
    type: 'pharmacy',
    description: 'In-house pharmacy services',
    location: { building: 'Main', floor: 0, wing: 'A' },
    capacity: 6,
    status: 'operational',
    operatingHours: { is24x7: true },
    services: [
      { name: 'General Medicines', price: 0, duration: 0, description: 'OTC and prescription medicines' },
      { name: 'Emergency Kits', price: 0, duration: 0, description: 'Emergency supplies and kits' },
    ],
    contactNumber: '+91 98765 55555',
    email: 'pharmacy@hospital.com'
  }
];

const createFacilitiesServices = async () => {
  for (const facility of facilities) {
    await Facility.updateOne(
      { code: facility.code },
      { $set: facility },
      { upsert: true }
    );
  }
  console.log(`✅ Seeded ${facilities.length} facilities with services.`);
};

module.exports = createFacilitiesServices;
