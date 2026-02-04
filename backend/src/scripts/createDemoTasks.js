const Task = require('../models/NH_Task');
const User = require('../models/NH_User');

const createDemoTasks = async () => {
  try {
    const head = await User.findOne({ email: 'headnurse@gmail.com' });
    const doc = await User.findOne({ email: 'doc1@gmail.com' });

    const tasks = [
      { title: 'Check vitals for room 101', description: 'Check vitals and update record', type: 'vitals', priority: 'high', assignedTo: head?._id, room: '101' },
      { title: 'Medication round - Ward A', description: 'Administer scheduled medications', type: 'medication', priority: 'medium', assignedTo: head?._id, room: 'Ward A' },
      { title: 'Review lab reports', description: 'Review new lab reports and advise', type: 'general', priority: 'low', assignedTo: doc?._id }
    ];

    for (const t of tasks) {
      const exists = await Task.findOne({ title: t.title });
      if (exists) continue;
      await Task.create({ ...t, createdBy: doc?._id || head?._id });
      console.log(`Created demo task: ${t.title}`);
    }

    console.log('Demo tasks seeding complete');
  } catch (error) {
    console.error('Error seeding demo tasks:', error);
  }
};

module.exports = createDemoTasks;