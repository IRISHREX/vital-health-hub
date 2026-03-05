/**
 * Seeder for creating the initial Grandmaster super-user.
 * Run: node backend/src/seeders/seedGrandmaster.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const config = require('../config');
const GrandmasterUser = require('../models/GM_GrandmasterUser');

const seed = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('Connected to MongoDB');

    const existing = await GrandmasterUser.findOne({ role: 'grandmaster' });
    if (existing) {
      console.log('Grandmaster already exists:', existing.email);
      process.exit(0);
    }

    const gm = await GrandmasterUser.create({
      email: 'grandmaster@platform.com',
      password: 'Grandmaster@123',
      firstName: 'Grand',
      lastName: 'Master',
      role: 'grandmaster',
      isActive: true
    });

    console.log('✅ Grandmaster user created:');
    console.log('   Email:', gm.email);
    console.log('   Password: Grandmaster@123');
    console.log('   Role:', gm.role);
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
};

seed();
