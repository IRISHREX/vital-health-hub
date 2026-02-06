const { Patient, Invoice, Bed } = require('../models');
const { AppError } = require('../middleware/errorHandler');

// @desc    Get all patients
// @route   GET /api/patients
// @access  Private
exports.getPatients = async (req, res, next) => {
  try {
    const { status, registrationType, search, page = 1, limit = 20 } = req.query;
    
    const query = {};
    
    if (status) query.status = status;
    if (registrationType) query.registrationType = registrationType;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { patientId: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Patient.countDocuments(query);
    const patients = await Patient.find(query)
      .populate('registeredBy', 'firstName lastName')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        patients,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single patient
// @route   GET /api/patients/:id
// @access  Private
exports.getPatient = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id)
      .populate('registeredBy', 'firstName lastName')
      .populate({ path: 'assignedDoctor', populate: { path: 'user', select: 'firstName lastName' } })
      .populate('assignedBed', 'bedNumber ward floor roomNumber bedType')
      .populate('assignedNurses', 'firstName lastName email')
      .populate('primaryNurse', 'firstName lastName email');
    
    if (!patient) {
      throw new AppError('Patient not found', 404);
    }

    res.json({
      success: true,
      data: { patient }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create patient
// @route   POST /api/patients
// @access  Private
exports.createPatient = async (req, res, next) => {
  try {
    const { 
      firstName, lastName, dateOfBirth, gender, phone, email, address, 
      emergencyContact, bloodGroup, registrationType, medicalHistory, 
      assignedDoctor, assignedBed 
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !dateOfBirth || !gender || !phone) {
      throw new AppError('Please provide all required fields', 400);
    }

    const patientData = {
      firstName,
      lastName,
      dateOfBirth,
      gender: gender.toLowerCase(),
      phone,
      email,
      address,
      emergencyContact,
      bloodGroup,
      registrationType: registrationType || 'opd',
      medicalHistory,
      registeredBy: req.user._id
    };

    // Assign doctor if provided
    if (assignedDoctor) {
      patientData.assignedDoctor = assignedDoctor;
    }

    // Assign nurses if provided
    if (req.body.assignedNurses) {
      patientData.assignedNurses = req.body.assignedNurses;
    }
    if (req.body.primaryNurse) {
      patientData.primaryNurse = req.body.primaryNurse;
    }

    // Assign bed if IPD and bed provided
    if (registrationType === 'ipd' && assignedBed) {
      patientData.assignedBed = assignedBed;
    }

    const patient = await Patient.create(patientData);
    console.log(`👤 Patient created: ${patient._id} - ${patient.firstName} ${patient.lastName} (${registrationType})`);

    // Update bed with current patient if IPD
    if (registrationType === 'ipd' && assignedBed) {
      try {
        await Bed.findByIdAndUpdate(
          assignedBed,
          { 
            currentPatient: patient._id,
            status: 'occupied',
            lastOccupied: new Date()
          },
          { new: true }
        );
      } catch (bedError) {
        console.error('Failed to update bed status:', bedError);
      }
    }

    // Auto-generate invoice for IPD patients
    if (registrationType === 'ipd' && assignedBed) {
      try {
        // Calculate due date (30 days from now)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);

        // Get bed details for bed charges
        const bed = await Bed.findById(assignedBed);
        const bedChargePerDay = bed?.pricePerDay || 0;

        const invoiceData = {
          patient: patient._id,
          type: 'ipd',
          items: [
            {
              description: `Bed Charges - ${bed?.bedType || 'General'} (${bed?.bedNumber || 'N/A'})`,
              category: 'bed_charges',
              quantity: 1,
              unitPrice: bedChargePerDay,
              discount: 0,
              tax: 0,
              amount: bedChargePerDay
            }
          ],
          subtotal: bedChargePerDay,
          discountAmount: 0,
          totalTax: 0,
          totalAmount: bedChargePerDay,
          dueAmount: bedChargePerDay,
          status: 'draft',
          dueDate: dueDate,
          generatedBy: req.user._id,
          notes: `Initial invoice for IPD admission of ${patient.firstName} ${patient.lastName}`
        };

        const createdInvoice = await Invoice.create(invoiceData);
        console.log('✅ IPD Invoice created successfully:', createdInvoice._id);
      } catch (invoiceError) {
        console.error('❌ Failed to create IPD invoice:', invoiceError.message);
        // Continue even if invoice creation fails
      }
    }

    // Auto-generate invoice for OPD patients
    if (registrationType === 'opd' || registrationType === 'emergency') {
      try {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);

        const invoiceData = {
          patient: patient._id,
          type: registrationType,
          items: [
            {
              description: `Consultation Fee`,
              category: registrationType === 'emergency' ? 'other' : 'doctor_fee',
              quantity: 1,
              unitPrice: 0,
              discount: 0,
              tax: 0,
              amount: 0
            }
          ],
          subtotal: 0,
          discountAmount: 0,
          totalTax: 0,
          totalAmount: 0,
          dueAmount: 0,
          status: 'draft',
          dueDate: dueDate,
          generatedBy: req.user._id,
          notes: `Initial invoice for ${registrationType.toUpperCase()} registration of ${patient.firstName} ${patient.lastName}`
        };

        const createdInvoice = await Invoice.create(invoiceData);
        console.log('✅ OPD Invoice created successfully:', createdInvoice._id);
      } catch (invoiceError) {
        console.error('❌ Failed to create OPD invoice:', invoiceError.message);
        // Continue even if invoice creation fails
      }
    }

    res.status(201).json({
      success: true,
      message: 'Patient registered successfully',
      data: { patient }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update patient
// @route   PUT /api/patients/:id
// @access  Private
exports.updatePatient = async (req, res, next) => {
  try {
    const { assignedBed } = req.body;
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      throw new AppError('Patient not found', 404);
    }

    // If bed assignment is changing
    if (assignedBed && assignedBed !== patient.assignedBed?.toString()) {
      // Release old bed if it exists
      if (patient.assignedBed) {
        await Bed.findByIdAndUpdate(
          patient.assignedBed,
          { 
            currentPatient: null,
            status: 'available',
            lastOccupied: new Date()
          },
          { new: true }
        );
      }

      // Assign new bed
      await Bed.findByIdAndUpdate(
        assignedBed,
        { 
          currentPatient: patient._id,
          status: 'occupied',
          lastOccupied: new Date()
        },
        { new: true }
      );
    }

    // If a nurse is making the update, restrict to nurse assignment fields only
    if (req.user.role === 'nurse') {
      // Nurse can only update assigned nurses if they are in charge of the bed where the patient is
      if (!patient.assignedBed) {
        throw new AppError('Nurses can only update assignments for patients assigned to a bed', 403);
      }

      const bed = await Bed.findById(patient.assignedBed).populate('nurseInCharge');
      if (!bed || !bed.nurseInCharge || bed.nurseInCharge._id.toString() !== req.user._id.toString()) {
        throw new AppError('Unauthorized. You are not the nurse in charge of this bed.', 403);
      }

      const updatePayload = {};
      if (req.body.assignedNurses !== undefined) updatePayload.assignedNurses = req.body.assignedNurses;
      if (req.body.primaryNurse !== undefined) updatePayload.primaryNurse = req.body.primaryNurse;

      const updatedPatient = await Patient.findByIdAndUpdate(
        req.params.id,
        updatePayload,
        { new: true, runValidators: true }
      ).populate('assignedNurses', 'firstName lastName email').populate('primaryNurse', 'firstName lastName email');

      console.log('[NH_patientController] nurse assignment update', {
        patientId: req.params.id,
        assignedNurses: updatePayload.assignedNurses,
        primaryNurse: updatePayload.primaryNurse
      });

      return res.json({
        success: true,
        message: 'Patient updated successfully',
        data: { patient: updatedPatient }
      });
    }

    // Allow update of nurse assignments as well for other roles
    const updatePayload = {
      ...req.body
    };
    if (req.body.assignedNurses !== undefined) updatePayload.assignedNurses = req.body.assignedNurses;
    if (req.body.primaryNurse !== undefined) updatePayload.primaryNurse = req.body.primaryNurse;

    const updatedPatient = await Patient.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true, runValidators: true }
    );

    if (updatePayload.assignedNurses !== undefined || updatePayload.primaryNurse !== undefined) {
      console.log('[NH_patientController] assignment update', {
        patientId: req.params.id,
        assignedNurses: updatePayload.assignedNurses,
        primaryNurse: updatePayload.primaryNurse
      });
    }

    res.json({
      success: true,
      message: 'Patient updated successfully',
      data: { patient: updatedPatient }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete patient
// @route   DELETE /api/patients/:id
// @access  Admin
exports.deletePatient = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      throw new AppError('Patient not found', 404);
    }

    // Delete all invoices associated with this patient
    await Invoice.deleteMany({ patient: patient._id });

    // Release assigned bed if any
    if (patient.assignedBed) {
      await Bed.findByIdAndUpdate(
        patient.assignedBed,
        { 
          currentPatient: null,
          status: 'available'
        },
        { new: true }
      );
    }

    // Actually delete the patient (not just deactivate)
    await Patient.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Patient and associated invoices deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get patient stats
// @route   GET /api/patients/stats
// @access  Private
exports.getPatientStats = async (req, res, next) => {
  try {
    const totalPatients = await Patient.countDocuments();
    const admittedPatients = await Patient.countDocuments({ status: 'admitted' });
    const opdPatients = await Patient.countDocuments({ registrationType: 'opd', status: 'active' });
    
    // Today's registrations
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRegistrations = await Patient.countDocuments({
      createdAt: { $gte: today }
    });

    // By gender
    const byGender = await Patient.aggregate([
      { $group: { _id: '$gender', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        total: totalPatients,
        admitted: admittedPatients,
        opd: opdPatients,
        todayRegistrations,
        byGender
      }
    });
  } catch (error) {
    next(error);
  }
};
