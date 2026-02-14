const User = require('./NH_User');
const Patient = require('./NH_Patient');
const Doctor = require('./NH_Doctor');
const Bed = require('./NH_Bed');
const Admission = require('./NH_Admission');
const Appointment = require('./NH_Appointment');
const Facility = require('./NH_Facility');
const Invoice = require('./NH_Invoice');
const Notification = require('./NH_Notification');
const Vital = require('./NH_Vital');
const ActivityLog = require('./NH_ActivityLog');
const Task = require('./NH_Task');
const BillingLedger = require('./NH_BillingLedger');
const ServiceOrder = require('./NH_ServiceOrder');
const LabTest = require('./NH_LabTest');
const LabTestCatalog = require('./NH_LabTestCatalog');
const { HospitalSettings, SecuritySettings, NotificationSettings, UserPreferences, VisualAccessSettings } = require('./NH_Settings');
const Medicine = require('./NH_Medicine');
const Prescription = require('./NH_Prescription');
const StockAdjustment = require('./NH_StockAdjustment');
const AccessRequest = require('./NH_AccessRequest');
const RadiologyOrder = require('./NH_RadiologyOrder');

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
  Vital,
  ActivityLog,
  Task,
  BillingLedger,
  ServiceOrder,
  LabTest,
  LabTestCatalog,
  HospitalSettings,
  SecuritySettings,
  NotificationSettings,
  UserPreferences,
  VisualAccessSettings,
  Medicine,
  Prescription,
  StockAdjustment,
  AccessRequest,
  RadiologyOrder
};
