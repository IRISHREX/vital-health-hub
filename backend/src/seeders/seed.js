const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/database');
const User = require('../models/NH_User');
const Doctor = require('../models/NH_Doctor');
const Patient = require('../models/NH_Patient');
const Bed = require('../models/NH_Bed');
const Admission = require('../models/NH_Admission');
const Facility = require('../models/NH_Facility');

const SEED_PASSWORD = 'Sohel@34892';

const seed = async () => {
  try {
    await connectDB();

    // Clear existing data (if any)
    const purgeModel = async (label, model) => {
      const existingCount = await model.countDocuments({});
      if (existingCount > 0) {
        await model.deleteMany({});
      }
      console.log(`${label}: removed ${existingCount} existing records.`);
    };

    await purgeModel('Users', User);
    await purgeModel('Doctors', Doctor);
    await purgeModel('Patients', Patient);
    await purgeModel('Beds', Bed);
    await purgeModel('Admissions', Admission);
    await purgeModel('Facilities', Facility);

    console.log('Cleared existing data.');

    // --- Seed Non-Doctor Users ---
    const roles = ['super_admin', 'hospital_admin', 'receptionist', 'billing_staff', 'nurse', 'head_nurse'];
    const usersToCreate = [];
    const seedCredentials = [];
    const commonHashedPassword = await bcrypt.hash(SEED_PASSWORD, 10);
    for (const role of roles) {
      const email = `${role.replace('_', '')}@example.com`;
      usersToCreate.push({
        email,
        password: commonHashedPassword,
        firstName: role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        lastName: 'User',
        role: role,
      });
      seedCredentials.push({ role, email, password: SEED_PASSWORD });
    }

    // --- Seed Doctors and their User accounts ---
    const doctorsData = [
        { firstName: 'Irish', lastName: 'Rex', email: 'irishrex@bms.com', phone: '9609436103', specialization: 'Cardiology' },
        { firstName: 'Sohel', lastName: 'Islam', email: 'sohelislam@bms.com', phone: '9609436102', specialization: 'Neurology' },
        { firstName: 'Asfak', lastName: 'Ahamed', email: 'asfakahamed@bms.com', phone: '9609436101', specialization: 'Oncology' },
        { firstName: 'Sameer', lastName: 'Sk', email: 'sameersk@bms.com', phone: '9609436100', specialization: 'Pediatrics' },
        { firstName: 'Khairul', lastName: 'Alam', email: 'khairulalam@bms.com', phone: '9609436104', specialization: 'Orthopedics' }
    ];

    const doctorPassword = await bcrypt.hash(SEED_PASSWORD, 10);

    for (const doc of doctorsData) {
        usersToCreate.push({
            email: doc.email,
            password: doctorPassword,
            firstName: doc.firstName,
            lastName: doc.lastName,
            role: 'doctor',
            phone: doc.phone
        });
        seedCredentials.push({ role: 'doctor', email: doc.email, password: SEED_PASSWORD });
    }

    const createdUsers = await User.insertMany(usersToCreate);
    console.log(`${createdUsers.length} users created.`);

    const doctorUsers = createdUsers.filter(u => u.role === 'doctor');

    const doctorsToCreate = [];
    for(const user of doctorUsers) {
        const docData = doctorsData.find(d => d.email === user.email);
        if (docData) {
            doctorsToCreate.push({
                user: user._id,
                name: `${user.firstName} ${user.lastName}`,
                email: user.email,
                phone: user.phone,
                specialization: docData.specialization,
                department: docData.specialization,
                qualification: 'MBBS, MD',
                availabilityStatus: 'available',
            });
        }
    }

    const createdDoctors = await Doctor.insertMany(doctorsToCreate);
    console.log(`${createdDoctors.length} doctors created.`);

    // --- Seed Facilities ---
    const facilitiesToCreate = [
        { name: 'Main Laboratory', type: 'lab', code: 'LAB001', location: { building: 'A', floor: 1 } },
        { name: 'Radiology Wing', type: 'radiology', code: 'RAD001', description: 'X-Ray, CT Scan, MRI', location: { building: 'A', floor: 2 } },
        { name: 'Operating Theater 1', type: 'ot', code: 'OT001', location: { building: 'B', floor: 1 } },
        { name: 'Operating Theater 2', type: 'ot', code: 'OT002', location: { building: 'B', floor: 1 } },
        { name: 'General Pharmacy', type: 'pharmacy', code: 'PHA001', location: { building: 'C', floor: 0 }, operatingHours: { is24x7: true } },
        { name: 'Intensive Care Unit', type: 'icu', code: 'ICU001', capacity: 10, location: { building: 'B', floor: 2 } },
        { name: 'Ambulance Service Bay', type: 'ambulance', code: 'AMB001', capacity: 5 },
        { name: 'Blood Bank', type: 'blood_bank', code: 'BLB001', location: { building: 'A', floor: 0 } },
        { name: 'Dialysis Center', type: 'dialysis', code: 'DIA001', capacity: 8, location: { building: 'C', floor: 1 } },
        { name: 'Physiotherapy & Rehab', type: 'physiotherapy', code: 'PHY001', location: { building: 'C', floor: 2 } },
    ];
    const createdFacilities = await Facility.insertMany(facilitiesToCreate);
    console.log(`${createdFacilities.length} facilities created.`);
    
    // --- Seed Patients ---
    const patientsToCreate = [];
    for (let i = 0; i < 20; i++) {
      patientsToCreate.push({
        firstName: 'OPD_Patient',
        lastName: `${i + 1}`,
        gender: i % 2 === 0 ? 'male' : 'female',
        phone: `123456789${i.toString().padStart(2, '0')}`,
        dateOfBirth: new Date(1990 + i, i % 12, (i % 28) + 1),
        registrationType: 'opd',
        admissionStatus: 'NOT_ADMITTED',
        status: 'active',
      });
    }
    const createdPatients = await Patient.insertMany(patientsToCreate);
    console.log(`${createdPatients.length} patients created.`);

    // --- Seed Beds ---
    const bedsToCreate = [];
    for (let i = 0; i < 10; i++) {
      bedsToCreate.push({
        bedNumber: `A${i + 1}`,
        ward: 'Male',
        status: 'available',
        bedType: 'general',
        roomNumber: '101',
        floor: 1,
        pricePerDay: Math.floor(Math.random() * 1000) + 500,
      });
      bedsToCreate.push({
        bedNumber: `B${i + 1}`,
        ward: 'Female',
        status: 'available',
        bedType: 'general',
        roomNumber: '102',
        floor: 1,
        pricePerDay: Math.floor(Math.random() * 1000) + 500,
      });
      bedsToCreate.push({
        bedNumber: `C${i + 1}`,
        ward: 'CCU',
        status: 'available',
        bedType: 'ccu',
        roomNumber: '201',
        floor: 2,
        pricePerDay: Math.floor(Math.random() * 2000) + 1500,
      });
      bedsToCreate.push({
        bedNumber: `D${i + 1}`,
        ward: 'ICU',
        status: 'available',
        bedType: 'icu',
        roomNumber: '202',
        floor: 2,
        pricePerDay: Math.floor(Math.random() * 3000) + 2500,
      });
    }
    const createdBeds = await Bed.insertMany(bedsToCreate);
    console.log(`${createdBeds.length} beds created.`);


    console.log('✅ Seeding complete.');
    console.log('--- Seed Credentials ---');
    seedCredentials.forEach((cred) => {
      console.log(`${cred.role} | ${cred.email} | ${cred.password}`);
    });
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error', err);
    process.exit(1);
  }
};

seed();
