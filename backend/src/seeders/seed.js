const connectDB = require('../config/database');
const createSuperAdmin = require('../scripts/createSuperAdmin');
const createNurses = require('../scripts/createNurses');
const createDemoStaff = require('../scripts/createDemoStaff');
const createDemoTasks = require('../scripts/createDemoTasks');

const seed = async () => {
  try {
    await connectDB();
    await createSuperAdmin();
    await createNurses();
    // create demo nurse & doctor accounts
    await createDemoStaff();
    // create demo tasks
    await createDemoTasks();

    console.log('✅ Seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error', err);
    process.exit(1);
  }
};

seed();