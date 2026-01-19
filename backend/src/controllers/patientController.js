const Patient = require('../models/Patient');
const Invoice = require('../models/Invoice');
const Doctor = require('../models/Doctor');
const Bed = require('../models/Bed');

// Create patient with auto-invoice
exports.createPatient = async (req, res) => {
  try {
    const patient = new Patient(req.body);
    await patient.save();

    // Auto-create invoice for the patient
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const invoiceItems = [];
    let subtotal = 0;

    // Add doctor fee if doctor is assigned
    if (patient.assignedDoctor) {
      const doctor = await Doctor.findById(patient.assignedDoctor);
      if (doctor) {
        const feeType = patient.registrationType === 'opd' ? 'opd' : 'ipd';
        const fee = doctor.consultationFee?.[feeType] || doctor.consultationFee?.opd || 500;
        invoiceItems.push({
          description: `Doctor Consultation - ${doctor.name}`,
          category: 'doctor_fee',
          quantity: 1,
          unitPrice: fee,
          discount: 0,
          tax: 0,
          amount: fee
        });
        subtotal += fee;
      }
    }

    // Add bed charges if bed is assigned (for IPD/emergency)
    if (patient.assignedBed && ['ipd', 'emergency'].includes(patient.registrationType)) {
      const bed = await Bed.findById(patient.assignedBed);
      if (bed) {
        invoiceItems.push({
          description: `Bed Charges - ${bed.bedNumber} (${bed.type})`,
          category: 'bed_charges',
          quantity: 1,
          unitPrice: bed.pricePerDay,
          discount: 0,
          tax: 0,
          amount: bed.pricePerDay
        });
        subtotal += bed.pricePerDay;

        // Update bed status to occupied
        await Bed.findByIdAndUpdate(patient.assignedBed, {
          status: 'occupied',
          currentPatient: patient._id
        });
      }
    }

    const invoice = new Invoice({
      patient: patient._id,
      type: patient.registrationType,
      items: invoiceItems,
      subtotal: subtotal,
      totalTax: 0,
      totalAmount: subtotal,
      paidAmount: 0,
      dueAmount: subtotal,
      status: subtotal > 0 ? 'pending' : 'draft',
      dueDate: dueDate,
      notes: `Auto-generated invoice for ${patient.firstName} ${patient.lastName}`,
      generatedBy: req.user?._id
    });

    await invoice.save();

    // Link invoice to patient
    patient.invoice = invoice._id;
    await patient.save();

    res.status(201).json({
      success: true,
      data: {
        patient,
        invoice
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get all patients
exports.getPatients = async (req, res) => {
  try {
    const { registrationType, status, search } = req.query;
    const filter = {};

    if (registrationType) filter.registrationType = registrationType;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { patientId: new RegExp(search, 'i') }
      ];
    }

    const patients = await Patient.find(filter)
      .populate('assignedDoctor', 'name specialization consultationFee')
      .populate('assignedBed', 'bedNumber ward type pricePerDay')
      .populate('invoice')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        patients,
        count: patients.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get single patient
exports.getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id)
      .populate('assignedDoctor', 'name specialization consultationFee')
      .populate('assignedBed', 'bedNumber ward type pricePerDay')
      .populate('invoice');

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    res.json({
      success: true,
      data: patient
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update patient - handles doctor/bed assignment and invoice updates
exports.updatePatient = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    const previousDoctor = patient.assignedDoctor?.toString();
    const previousBed = patient.assignedBed?.toString();
    const newDoctor = req.body.assignedDoctor;
    const newBed = req.body.assignedBed;

    // Update patient
    Object.assign(patient, req.body);
    await patient.save();

    // Handle invoice updates
    let invoice = await Invoice.findOne({ patient: patient._id });
    
    if (!invoice) {
      // Create invoice if doesn't exist
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      invoice = new Invoice({
        patient: patient._id,
        type: patient.registrationType,
        items: [],
        subtotal: 0,
        totalTax: 0,
        totalAmount: 0,
        paidAmount: 0,
        dueAmount: 0,
        status: 'draft',
        dueDate: dueDate,
        generatedBy: req.user?._id
      });
    }

    // Handle doctor change
    if (newDoctor && newDoctor !== previousDoctor) {
      const doctor = await Doctor.findById(newDoctor);
      if (doctor) {
        const feeType = patient.registrationType === 'opd' ? 'opd' : 'ipd';
        const fee = doctor.consultationFee?.[feeType] || doctor.consultationFee?.opd || 500;
        
        // Add new doctor fee item
        invoice.items.push({
          description: `Doctor Consultation - ${doctor.name}`,
          category: 'doctor_fee',
          quantity: 1,
          unitPrice: fee,
          discount: 0,
          tax: 0,
          amount: fee
        });
      }
    }

    // Handle bed change
    if (newBed && newBed !== previousBed) {
      // Release previous bed
      if (previousBed) {
        await Bed.findByIdAndUpdate(previousBed, {
          status: 'available',
          currentPatient: null
        });
      }

      const bed = await Bed.findById(newBed);
      if (bed) {
        // Add bed charges
        invoice.items.push({
          description: `Bed Charges - ${bed.bedNumber} (${bed.type})`,
          category: 'bed_charges',
          quantity: 1,
          unitPrice: bed.pricePerDay,
          discount: 0,
          tax: 0,
          amount: bed.pricePerDay
        });

        // Mark bed as occupied
        await Bed.findByIdAndUpdate(newBed, {
          status: 'occupied',
          currentPatient: patient._id
        });
      }
    } else if (!newBed && previousBed) {
      // Bed was removed
      await Bed.findByIdAndUpdate(previousBed, {
        status: 'available',
        currentPatient: null
      });
    }

    // Recalculate invoice totals
    invoice.subtotal = invoice.items.reduce((sum, item) => sum + item.amount, 0);
    invoice.totalAmount = invoice.subtotal + invoice.totalTax - invoice.discountAmount;
    invoice.dueAmount = invoice.totalAmount - invoice.paidAmount;
    
    if (invoice.subtotal > 0 && invoice.status === 'draft') {
      invoice.status = 'pending';
    }

    await invoice.save();

    // Link invoice to patient if not linked
    if (!patient.invoice) {
      patient.invoice = invoice._id;
      await patient.save();
    }

    const updatedPatient = await Patient.findById(req.params.id)
      .populate('assignedDoctor', 'name specialization consultationFee')
      .populate('assignedBed', 'bedNumber ward type pricePerDay')
      .populate('invoice');

    res.json({
      success: true,
      data: {
        patient: updatedPatient,
        invoice
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Delete patient - cascade delete invoice
exports.deletePatient = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Release bed if assigned
    if (patient.assignedBed) {
      await Bed.findByIdAndUpdate(patient.assignedBed, {
        status: 'available',
        currentPatient: null
      });
    }

    // Delete associated invoice
    if (patient.invoice) {
      await Invoice.findByIdAndDelete(patient.invoice);
    }

    // Also find and delete any invoices linked to this patient
    await Invoice.deleteMany({ patient: patient._id });

    await Patient.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Patient and associated invoice deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
