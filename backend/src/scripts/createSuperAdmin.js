const User = require('../models/NH_User');

const createSuperAdmin = async () => {
  try {
    const superAdmin = {
      email: 'Sohel.Islam@Ibm.com',
      password: 'Sohel@34892',
      firstName: 'Sohel',
      lastName: 'Islam',
      role: 'super_admin',
    };

    const existingAdmin = await User.findOne({ email: superAdmin.email });

    if (existingAdmin) {
      console.log('Super admin already exists.');
      return;
    }

    await User.create(superAdmin);
    console.log('Super admin created successfully.');
  } catch (error) {
    console.error('Error creating super admin:', error);
  }
};

module.exports = createSuperAdmin;
