const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const invoiceController = require('../controllers/invoiceController');
const doctorController = require('../controllers/doctorController');
const bedController = require('../controllers/bedController');

// Patient routes
router.post('/patients', patientController.createPatient);
router.get('/patients', patientController.getPatients);
router.get('/patients/:id', patientController.getPatientById);
router.put('/patients/:id', patientController.updatePatient);
router.delete('/patients/:id', patientController.deletePatient);

// Invoice routes
router.post('/invoices', invoiceController.createInvoice);
router.get('/invoices', invoiceController.getInvoices);
router.get('/invoices/:id', invoiceController.getInvoiceById);
router.put('/invoices/:id', invoiceController.updateInvoice);
router.delete('/invoices/:id', invoiceController.deleteInvoice);
router.post('/invoices/:id/items', invoiceController.addInvoiceItem);
router.post('/invoices/:id/payments', invoiceController.addPayment);
router.get('/invoices/patient/:patientId', invoiceController.getInvoiceByPatient);

// Doctor routes
router.post('/doctors', doctorController.createDoctor);
router.get('/doctors', doctorController.getDoctors);
router.get('/doctors/:id', doctorController.getDoctorById);
router.put('/doctors/:id', doctorController.updateDoctor);
router.patch('/doctors/:id/availability', doctorController.updateAvailability);
router.delete('/doctors/:id', doctorController.deleteDoctor);

// Bed routes
router.post('/beds', bedController.createBed);
router.get('/beds', bedController.getBeds);
router.get('/beds/:id', bedController.getBedById);
router.put('/beds/:id', bedController.updateBed);
router.delete('/beds/:id', bedController.deleteBed);
router.get('/beds/stats', bedController.getBedStats);

module.exports = router;
