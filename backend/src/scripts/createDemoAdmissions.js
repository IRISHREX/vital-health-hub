const { Admission, Patient, Bed, Doctor } = require('../models');

const createDemoAdmissions = async () => {
  const availableBeds = await Bed.find({ status: 'available', isActive: true }).limit(10);
  const patients = await Patient.find({}).limit(10);
  const doctors = await Doctor.find({}).limit(1);

  if (!availableBeds.length || !patients.length) {
    console.log('⚠️  Skipping admissions seed: not enough beds or patients.');
    return;
  }

  const admittingDoctor = doctors[0]?._id;
  let created = 0;

  for (let i = 0; i < Math.min(availableBeds.length, patients.length, 5); i++) {
    const bed = availableBeds[i];
    const patient = patients[i];

    const existing = await Admission.findOne({ patient: patient._id, status: 'ADMITTED' });
    if (existing) continue;
    if (bed.status !== 'available' || bed.currentPatient) continue;

    const admissionId = `ADM${Date.now()}-${i + 1}`;
    const admission = await Admission.create({
      admissionId,
      patient: patient._id,
      bed: bed._id,
      admittingDoctor,
      admissionType: 'elective',
      admissionDate: new Date(),
      diagnosis: { primary: 'General observation' },
      status: 'ADMITTED'
    });

    await Bed.findByIdAndUpdate(
      bed._id,
      {
        status: 'occupied',
        currentPatient: patient._id,
        currentAdmission: admission._id,
        lastOccupied: new Date()
      },
      { new: true }
    );

    await Patient.findByIdAndUpdate(
      patient._id,
      {
        assignedBed: bed._id,
        currentAdmission: admission._id,
        admissionStatus: 'ADMITTED',
        status: 'admitted'
      },
      { new: true }
    );

    created += 1;
  }

  console.log(`✅ Seeded ${created} admissions.`);
};

module.exports = createDemoAdmissions;
