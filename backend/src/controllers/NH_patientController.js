const {
  Patient,
  Invoice,
  Bed,
  Appointment,
  Admission,
  Vital,
  LabTest,
  Prescription,
  ServiceOrder,
  BillingLedger,
  Task,
  User
} = require('../models');
const { AppError } = require('../middleware/errorHandler');
const { assertAssignmentAllowed } = require('../utils/assignmentPermissions');

const safeDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toText = (value) => String(value || '').toLowerCase();

const enforcePatientAssignmentPolicy = async (req, payload = {}) => {
  const nurseIds = [
    ...(Array.isArray(payload.assignedNurses) ? payload.assignedNurses : []),
    payload.primaryNurse
  ].filter(Boolean);

  if (!nurseIds.length) return;

  const nurses = await User.find({ _id: { $in: nurseIds } }).select('role');
  if (nurses.length !== nurseIds.length) {
    throw new AppError('One or more assigned nurses are invalid', 400);
  }

  for (const nurse of nurses) {
    await assertAssignmentAllowed({
      assignmentType: 'patient',
      assignerRole: req.user?.role,
      assigneeRole: nurse.role
    });
  }
};

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

// @desc    Get unified patient history timeline
// @route   GET /api/patients/:id/history
// @access  Private
exports.getPatientHistory = async (req, res, next) => {
  try {
    const patientId = req.params.id;
    const page = Math.max(1, Number.parseInt(req.query.page || '1', 10));
    const limit = Math.min(200, Math.max(10, Number.parseInt(req.query.limit || '50', 10)));
    const fromDate = safeDate(req.query.from);
    const toDate = safeDate(req.query.to);
    const search = String(req.query.search || '').trim().toLowerCase();
    const modulesFilter = new Set(
      String(req.query.modules || '')
        .split(',')
        .map((m) => m.trim().toLowerCase())
        .filter(Boolean)
    );

    const patient = await Patient.findById(patientId)
      .select('patientId firstName lastName phone gender dateOfBirth registrationType status admissionStatus')
      .lean();
    if (!patient) throw new AppError('Patient not found', 404);

    const shouldIncludeModule = (moduleName) =>
      modulesFilter.size === 0 || modulesFilter.has(String(moduleName).toLowerCase());

    const timeline = [];
    const pushEvent = (event) => {
      if (!event || !event.timestamp) return;
      const eventDate = safeDate(event.timestamp);
      if (!eventDate) return;
      if (fromDate && eventDate < fromDate) return;
      if (toDate && eventDate > toDate) return;

      if (search) {
        const haystack = [
          event.module,
          event.type,
          event.title,
          event.description,
          event.status
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(search)) return;
      }

      timeline.push({
        ...event,
        timestamp: eventDate.toISOString()
      });
    };

    if (shouldIncludeModule('appointments') || shouldIncludeModule('opd')) {
      const appointments = await Appointment.find({ patient: patientId })
        .populate({
          path: 'doctor',
          populate: { path: 'user', select: 'firstName lastName' }
        })
        .sort({ createdAt: -1 })
        .lean();

      appointments.forEach((apt) => {
        const doctorName = apt?.doctor?.name
          || `${apt?.doctor?.user?.firstName || ''} ${apt?.doctor?.user?.lastName || ''}`.trim()
          || 'Doctor';
        pushEvent({
          id: `appointment-${apt._id}`,
          module: 'appointments',
          type: 'appointment',
          title: `${String(apt.type || 'opd').toUpperCase()} Appointment`,
          description: `With ${doctorName}${apt.reason ? ` • ${apt.reason}` : ''}`,
          status: apt.status,
          timestamp: apt.appointmentDate || apt.createdAt,
          sourceId: apt._id,
          metadata: {
            appointmentId: apt.appointmentId,
            tokenNumber: apt.tokenNumber,
            fee: apt.fee,
            paymentStatus: apt.paymentStatus
          }
        });
      });
    }

    if (shouldIncludeModule('admissions') || shouldIncludeModule('ipd') || shouldIncludeModule('beds')) {
      const admissions = await Admission.find({ patient: patientId })
        .populate('bed', 'bedNumber ward floor roomNumber bedType')
        .populate('admittingDoctor', 'name')
        .populate('dischargingDoctor', 'name')
        .sort({ createdAt: -1 })
        .lean();

      admissions.forEach((admission) => {
        const bedLabel = admission?.bed
          ? `${admission.bed.bedNumber || ''}${admission.bed.ward ? ` (${admission.bed.ward})` : ''}`.trim()
          : 'No bed';

        pushEvent({
          id: `admission-${admission._id}`,
          module: 'admissions',
          type: 'admission',
          title: `Admission ${admission.status || 'ADMITTED'}`,
          description: `${String(admission.admissionType || 'ipd').toUpperCase()} • ${bedLabel}`,
          status: admission.status,
          timestamp: admission.admissionDate || admission.createdAt,
          sourceId: admission._id,
          metadata: {
            admissionId: admission.admissionId,
            diagnosis: admission?.diagnosis?.primary || null
          }
        });

        if (admission.actualDischargeDate) {
          pushEvent({
            id: `discharge-${admission._id}`,
            module: 'admissions',
            type: 'discharge',
            title: 'Discharge Completed',
            description: admission.dischargeNotes || 'Patient discharged',
            status: admission.status,
            timestamp: admission.actualDischargeDate,
            sourceId: admission._id
          });
        }

        (admission.transferHistory || []).forEach((transfer, idx) => {
          pushEvent({
            id: `transfer-${admission._id}-${idx}`,
            module: 'beds',
            type: 'bed_transfer',
            title: 'Bed/Ward Transfer',
            description: `${transfer.fromWard || 'Unknown'} -> ${transfer.toWard || 'Unknown'}${transfer.transferReason ? ` • ${transfer.transferReason}` : ''}`,
            status: 'transferred',
            timestamp: transfer.transferDate || admission.updatedAt,
            sourceId: admission._id
          });
        });

        (admission.bedAllocations || []).forEach((allocation, idx) => {
          const allocatedFrom = safeDate(allocation.allocatedFrom);
          const allocatedTo = safeDate(allocation.allocatedTo);
          const days = allocatedFrom && allocatedTo
            ? Math.max(1, Math.ceil((allocatedTo - allocatedFrom) / (1000 * 60 * 60 * 24)))
            : null;
          pushEvent({
            id: `bed-allocation-${admission._id}-${idx}`,
            module: 'beds',
            type: 'bed_allocation',
            title: 'Bed Allocation Window',
            description: `${days ? `${days} day(s)` : 'Duration unknown'} • Rate ${allocation.pricePerDay || 0}/day`,
            status: allocation.status || 'ALLOCATED',
            timestamp: allocation.allocatedFrom || admission.createdAt,
            sourceId: admission._id,
            metadata: {
              pricePerDay: allocation.pricePerDay,
              allocatedTo: allocation.allocatedTo || null
            }
          });
        });
      });
    }

    if (shouldIncludeModule('vitals')) {
      const vitals = await Vital.find({ patient: patientId })
        .populate('recordedBy', 'firstName lastName')
        .sort({ recordedAt: -1 })
        .lean();

      vitals.forEach((vital) => {
        pushEvent({
          id: `vital-${vital._id}`,
          module: 'vitals',
          type: 'vital_record',
          title: 'Vitals Recorded',
          description: `BP ${vital?.bloodPressure?.systolic || '-'} / ${vital?.bloodPressure?.diastolic || '-'} • HR ${vital?.heartRate?.value || '-'} • SpO2 ${vital?.oxygenSaturation?.value || '-'}`,
          status: 'recorded',
          timestamp: vital.recordedAt || vital.createdAt,
          sourceId: vital._id
        });
      });
    }

    if (shouldIncludeModule('prescriptions') || shouldIncludeModule('pharmacy')) {
      const prescriptions = await Prescription.find({ patient: patientId })
        .populate('doctor', 'name firstName lastName')
        .populate('items.medicine', 'sellingPrice')
        .sort({ createdAt: -1 })
        .lean();

      prescriptions.forEach((rx) => {
        const estAmount = (rx.items || []).reduce((sum, item) => {
          const rate = Number(item?.medicine?.sellingPrice || 0);
          return sum + (rate * Number(item?.quantity || 0));
        }, 0);
        pushEvent({
          id: `prescription-${rx._id}`,
          module: 'prescriptions',
          type: 'prescription',
          title: 'Prescription Issued',
          description: `${(rx.items || []).length} medicine(s) • ${String(rx.encounterType || 'opd').toUpperCase()}`,
          status: rx.status,
          timestamp: rx.prescribedAt || rx.createdAt,
          sourceId: rx._id,
          metadata: {
            estimatedAmount: estAmount,
            followUpDate: rx.followUpDate || null
          }
        });
      });
    }

    if (shouldIncludeModule('lab') || shouldIncludeModule('lab-tests')) {
      const labTests = await LabTest.find({ patient: patientId })
        .sort({ createdAt: -1 })
        .lean();

      labTests.forEach((test) => {
        pushEvent({
          id: `lab-${test._id}`,
          module: 'lab',
          type: 'lab_test',
          title: `Lab Test ${String(test.status || 'ordered').replace(/_/g, ' ')}`,
          description: `${test.testName || test.testCode || 'Lab test'} • ${String(test.priority || 'routine').toUpperCase()}`,
          status: test.status,
          timestamp: test.createdAt,
          sourceId: test._id,
          metadata: {
            testId: test.testId,
            sampleId: test.sampleId,
            totalAmount: test.totalAmount
          }
        });

        if (test.sampleCollectedAt) {
          pushEvent({
            id: `lab-sample-${test._id}`,
            module: 'lab',
            type: 'sample_collected',
            title: 'Lab Sample Collected',
            description: `${test.sampleType || 'sample'} • ${test.sampleStatus || 'collected'}`,
            status: test.sampleStatus,
            timestamp: test.sampleCollectedAt,
            sourceId: test._id
          });
        }

        if (test.completedAt) {
          pushEvent({
            id: `lab-result-${test._id}`,
            module: 'lab',
            type: 'lab_result',
            title: 'Lab Result Generated',
            description: test.interpretation || test.remarks || test.testName || 'Result available',
            status: test.status,
            timestamp: test.completedAt,
            sourceId: test._id
          });
        }
      });
    }

    if (shouldIncludeModule('billing') || shouldIncludeModule('charges') || shouldIncludeModule('invoices')) {
      const invoices = await Invoice.find({ patient: patientId })
        .populate('generatedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .lean();

      invoices.forEach((invoice) => {
        pushEvent({
          id: `invoice-${invoice._id}`,
          module: 'billing',
          type: 'invoice',
          title: `${String(invoice.type || 'other').toUpperCase()} Invoice`,
          description: `${invoice.invoiceNumber || 'Draft'} • ${(invoice.items || []).length} item(s)`,
          status: invoice.status,
          timestamp: invoice.createdAt,
          sourceId: invoice._id,
          metadata: {
            totalAmount: invoice.totalAmount,
            paidAmount: invoice.paidAmount,
            dueAmount: invoice.dueAmount
          }
        });

        (invoice.payments || []).forEach((payment, idx) => {
          pushEvent({
            id: `payment-${invoice._id}-${idx}`,
            module: 'billing',
            type: 'payment',
            title: 'Payment Received',
            description: `${payment.method || 'unknown'} • ${payment.reference || 'no reference'}`,
            status: 'paid',
            timestamp: payment.paidAt || invoice.updatedAt,
            sourceId: invoice._id,
            metadata: { amount: payment.amount }
          });
        });
      });

      const ledgerRows = await BillingLedger.find({ patient: patientId })
        .sort({ createdAt: -1 })
        .lean();
      ledgerRows.forEach((row) => {
        pushEvent({
          id: `ledger-${row._id}`,
          module: 'charges',
          type: row.sourceType || 'charge',
          title: 'Charge Entry',
          description: row.description || row.category || 'Charge recorded',
          status: row.billed ? 'billed' : 'unbilled',
          timestamp: row.createdAt,
          sourceId: row._id,
          metadata: {
            amount: row.amount,
            category: row.category
          }
        });
      });
    }

    if (shouldIncludeModule('services') || shouldIncludeModule('facilities')) {
      const serviceOrders = await ServiceOrder.find({ patient: patientId })
        .populate('facility', 'name type location')
        .populate('orderedBy', 'firstName lastName')
        .populate('performedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .lean();

      serviceOrders.forEach((order) => {
        pushEvent({
          id: `service-${order._id}`,
          module: 'services',
          type: order.type || 'service_order',
          title: 'Service/Facility Order',
          description: `${order?.service?.name || 'Service'}${order?.facility?.name ? ` • ${order.facility.name}` : ''}`,
          status: order.status,
          timestamp: order.orderedAt || order.createdAt,
          sourceId: order._id,
          metadata: {
            quantity: order.quantity,
            unitPrice: order.unitPrice,
            totalAmount: order.totalAmount
          }
        });

        if (order.performedAt) {
          pushEvent({
            id: `service-performed-${order._id}`,
            module: 'services',
            type: 'service_completed',
            title: 'Service Completed',
            description: order.result || order.notes || order?.service?.name || 'Service completed',
            status: order.status,
            timestamp: order.performedAt,
            sourceId: order._id
          });
        }
      });
    }

    if (shouldIncludeModule('tasks')) {
      const tasks = await Task.find({ patient: patientId })
        .populate('assignedTo', 'firstName lastName')
        .populate('createdBy', 'firstName lastName')
        .populate('completedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .lean();

      tasks.forEach((task) => {
        pushEvent({
          id: `task-${task._id}`,
          module: 'tasks',
          type: task.type || 'task',
          title: 'Task Created',
          description: task.title || task.description || 'Task assigned',
          status: task.status,
          timestamp: task.createdAt,
          sourceId: task._id,
          metadata: {
            priority: task.priority,
            dueDate: task.dueDate || null
          }
        });

        if (task.completedAt) {
          pushEvent({
            id: `task-complete-${task._id}`,
            module: 'tasks',
            type: 'task_completed',
            title: 'Task Completed',
            description: task.title || 'Task completed',
            status: 'completed',
            timestamp: task.completedAt,
            sourceId: task._id
          });
        }
      });
    }

    timeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const totalEvents = timeline.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = timeline.slice(start, end);

    const moduleBreakdown = timeline.reduce((acc, item) => {
      const key = item.module || 'other';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const financial = timeline.reduce(
      (acc, event) => {
        const totalAmount = Number(event?.metadata?.totalAmount || 0);
        const paidAmount = Number(event?.metadata?.paidAmount || 0);
        const dueAmount = Number(event?.metadata?.dueAmount || 0);
        const amount = Number(event?.metadata?.amount || 0);

        if (event.type === 'invoice') {
          acc.totalBilled += totalAmount;
          acc.totalPaid += paidAmount;
          acc.totalDue += dueAmount;
        }
        if (event.type === 'payment') {
          acc.payments += amount;
        }
        if (event.module === 'charges') {
          acc.ledgerCharges += amount;
        }
        return acc;
      },
      { totalBilled: 0, totalPaid: 0, totalDue: 0, payments: 0, ledgerCharges: 0 }
    );

    res.json({
      success: true,
      data: {
        patient: {
          _id: patient._id,
          patientId: patient.patientId,
          fullName: `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
          registrationType: patient.registrationType,
          status: patient.status,
          admissionStatus: patient.admissionStatus
        },
        summary: {
          totalEvents,
          moduleBreakdown,
          financial
        },
        pagination: {
          total: totalEvents,
          page,
          limit,
          pages: Math.ceil(totalEvents / limit)
        },
        timeline: paginated
      }
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
    await enforcePatientAssignmentPolicy(req, patientData);

    // Assign bed if IPD and bed provided
    if (registrationType === 'ipd' && assignedBed) {
      patientData.assignedBed = assignedBed;
      patientData.status = 'admitted';
      patientData.admissionStatus = 'ADMITTED';
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
      if (patient.admissionStatus === 'DISCHARGED') {
        throw new AppError('Cannot assign bed to a discharged patient', 400);
      }

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

      // Update patient status to admitted when assigning a bed
      req.body.status = 'admitted';
      req.body.admissionStatus = 'ADMITTED';
      req.body.registrationType = 'ipd';
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
      await enforcePatientAssignmentPolicy(req, updatePayload);

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
    await enforcePatientAssignmentPolicy(req, updatePayload);

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
