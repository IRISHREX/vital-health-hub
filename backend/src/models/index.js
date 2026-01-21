const User = require('./NH_User');
const Patient = require('./NH_Patient');
const Doctor = require('./NH_Doctor');
const Bed = require('./NH_Bed');
const Admission = require('./NH_Admission');
const Appointment = require('./NH_Appointment');
const Facility = require('./NH_Facility');
const Invoice = require('./NH_Invoice');
const Notification = require('./NH_Notification');
const { HospitalSettings, SecuritySettings, NotificationSettings, UserPreferences } = require('./NH_Settings');

module.exports = {
  User,
  Patient,
  Doctor,
  Bed,
  Admission,
  Appointment,
  Facility,
  Invoice,
  Notification,
  HospitalSettings,
  SecuritySettings,
  NotificationSettings,
  UserPreferences
};
