const User = require('../models/NH_User');

const createDemoStaff = async () => {
  try {
    const staff = [
      { email: 'headnurse@gmail.com', password: 'Sohel@34892', firstName: 'Head', lastName: 'Nurse', role: 'nurse' },
      { email: 'doc1@gmail.com', password: 'Sohel@34892', firstName: 'Doc', lastName: 'One', role: 'doctor' }
    ];

    for (const s of staff) {
      const existing = await User.findOne({ email: s.email.toLowerCase() });
      if (existing) {
        console.log(`User already exists: ${s.email}`);
        continue;
      }
      await User.create(s);
      console.log(`Created user: ${s.email} (${s.role})`);
    }

    console.log('Demo staff seeding complete');
  } catch (error) {
    console.error('Error seeding demo staff:', error);
  }
};

module.exports = createDemoStaff;