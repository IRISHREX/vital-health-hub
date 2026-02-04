const User = require('../models/NH_User');

const createNurses = async () => {
  try {
    const nurses = [
      { email: 'sarah.johnson@example.com', password: 'nurse123', firstName: 'Sarah', lastName: 'Johnson', role: 'nurse' },
      { email: 'mike.chen@example.com', password: 'nurse123', firstName: 'Mike', lastName: 'Chen', role: 'nurse' },
      { email: 'emily.davis@example.com', password: 'nurse123', firstName: 'Emily', lastName: 'Davis', role: 'nurse' }
    ];

    for (const n of nurses) {
      const existing = await User.findOne({ email: n.email });
      if (existing) {
        console.log(`Nurse already exists: ${n.email}`);
        continue;
      }
      await User.create(n);
      console.log(`Created nurse: ${n.email}`);
    }

    console.log('Nurse seeding complete');
  } catch (error) {
    console.error('Error seeding nurses:', error);
  }
};

module.exports = createNurses;