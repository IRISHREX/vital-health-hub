const { Admission, Bed, Patient, Invoice } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const { emitBedUpdate, emitNotification } = require('../config/socket');

/**
 * PATIENT ADMISSION FLOW
 * - Check bed availability
 * - Create admission record
 * - Update bed status to occupied
 * - Initialize invoice
 */

// @desc    Admit a patient to a bed
// @route   POST /api/admissions
// @access  Private
exports.createAdmission = async (req, res, next) => {
  try {
    const {
      patientId,
      bedId,
      admittingDoctorId,
      attendingDoctors = [],
      admissionType,
      diagnosis,
      symptoms = [],
      treatmentPlan,
      expectedDischargeDate,
      notes,
      facility
    } = req.body;

    // Validate required fields
    if (!patientId || !admissionType) {
      throw new AppError('Missing required fields: patientId, admissionType', 400);
    }

    // For IPD admissions, bed and doctor are required
    if (admissionType === 'elective' && (!bedId || !admittingDoctorId)) {
      throw new AppError('For IPD admissions, bedId and admittingDoctorId are required', 400);
    }

    // Check if patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      throw new AppError('Patient not found', 404);
    }

    // Check if patient already has an active admission
    const activeAdmission = await Admission.findOne({
      patient: patientId,
      status: 'ADMITTED'
    });
    if (activeAdmission) {
      throw new AppError('Patient already has an active admission', 400);
    }

    // Check if bed exists and is available (only for IPD/elective admissions)
    let bed = null;
    if (bedId) {
      bed = await Bed.findById(bedId);
      if (!bed) {
        throw new AppError('Bed not found', 404);
      }

      if (bed.status !== 'available') {
        throw new AppError(`Bed is not available. Current status: ${bed.status}`, 400);
      }
    }

    // Generate unique admission ID
    const admissionCount = await Admission.countDocuments();
    const admissionId = `ADM${Date.now()}-${admissionCount + 1}`;

    // Create admission record - bed and doctor are optional for Emergency/OPD
    const admission = new Admission({
      admissionId,
      patient: patientId,
      ...(bedId && { bed: bedId }),
      ...(admittingDoctorId && { admittingDoctor: admittingDoctorId }),
      attendingDoctors,
      admissionDate: new Date(),
      expectedDischargeDate,
      admissionType,
      diagnosis,
      symptoms,
      treatmentPlan,
      status: 'ADMITTED',
      notes
    });

    await admission.save();

    // Update bed status only if bed was provided
    if (bed) {
      bed.status = 'occupied';
      bed.currentPatient = patientId;
      bed.currentAdmission = admission._id;
      bed.lastOccupied = new Date();
      await bed.save();
    }

    // Update patient's assigned bed and admission
    const patientUpdateData = { 
      currentAdmission: admission._id,
      admissionStatus: 'ADMITTED'
    };
    if (bedId) {
      patientUpdateData.assignedBed = bedId;
    }
    await Patient.findByIdAndUpdate(patientId, patientUpdateData, { new: true });

    // Create initial invoice only for IPD admissions with bed
    let invoice = null;
    if (bed) {
      const pricePerDay = bed.pricePerDay;
      const invoiceAmount = pricePerDay; // Initial charge for first day

      invoice = new Invoice({
        patient: patientId,
        admission: admission._id,
        type: 'ipd',
        status: 'draft',
        items: [
          {
            description: `Bed charges - ${bed.bedType} (${bed.bedNumber})`,
            category: 'bed_charges',
            quantity: 1,
            unitPrice: pricePerDay,
            discount: 0,
            tax: 0,
            amount: pricePerDay
          }
        ],
        subtotal: invoiceAmount,
        discountAmount: 0,
        totalTax: 0,
        totalAmount: invoiceAmount,
        paidAmount: 0,
        dueAmount: invoiceAmount,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        notes: `Invoice for admission - ${admission.admissionId}`
      });

      await invoice.save();
    } else {
      // For Emergency/OPD, create a basic invoice without bed charges
      invoice = new Invoice({
        patient: patientId,
        admission: admission._id,
        type: admissionType === 'emergency' ? 'emergency' : 'opd',
        status: 'draft',
        items: [],
        subtotal: 0,
        discountAmount: 0,
        totalTax: 0,
        totalAmount: 0,
        paidAmount: 0,
        dueAmount: 0,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notes: `Invoice for ${admissionType} admission - ${admission.admissionId}`
      });

      await invoice.save();
    }

    // Populate response
    const populatedAdmission = await Admission.findById(admission._id)
      .populate('patient', 'firstName lastName patientId phone email')
      .populate('bed')
      .populate('admittingDoctor')
      .populate('attendingDoctors');

    // Emit bed update notification
    emitBedUpdate(bed);

    // Send notification
    emitNotification({
      type: 'admission',
      title: 'Patient Admitted',
      message: `${patient.firstName} ${patient.lastName} admitted to bed ${bed.bedNumber}`,
      data: { admissionId: admission._id, bedId, patientId }
    });

    res.status(201).json({
      success: true,
      message: 'Patient admitted successfully',
      data: {
        admission: populatedAdmission,
        invoice: invoice._id
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATIENT TRANSFER FLOW
 * - Validate new bed availability
 * - Close old bed allocation with end time
 * - Open new bed allocation with start time
 * - Do NOT close admission
 * - Create transfer record
 * - Update invoice with split charges
 */

// @desc    Transfer patient to different bed/ward
// @route   POST /api/admissions/:admissionId/transfer
// @access  Private
exports.transferPatient = async (req, res, next) => {
  try {
    const { admissionId } = req.params;
    const { newBedId, transferReason } = req.body;

    if (!newBedId) {
      throw new AppError('newBedId is required', 400);
    }

    // Get current admission
    const admission = await Admission.findById(admissionId);
    if (!admission) {
      throw new AppError('Admission not found', 404);
    }

    if (admission.status !== 'ADMITTED') {
      throw new AppError('Can only transfer patients with ADMITTED status', 400);
    }

    // Get old bed
    const oldBed = await Bed.findById(admission.bed);
    if (!oldBed) {
      throw new AppError('Current bed not found', 404);
    }

    // Get new bed
    const newBed = await Bed.findById(newBedId);
    if (!newBed) {
      throw new AppError('New bed not found', 404);
    }

    if (newBed.status !== 'available') {
      throw new AppError(`New bed is not available. Status: ${newBed.status}`, 400);
    }

    if (newBedId === admission.bed.toString()) {
      throw new AppError('Patient is already in this bed', 400);
    }

    const transferDate = new Date();

    // Create bed utilization record for old bed (end the allocation)
    const oldBedUtilization = {
      bed: oldBed._id,
      admission: admissionId,
      allocatedFrom: admission.bedAllocations?.[admission.bedAllocations.length - 1]?.allocatedFrom || admission.admissionDate,
      allocatedTo: transferDate,
      pricePerDay: oldBed.pricePerDay,
      status: 'RELEASED'
    };

    // Calculate old bed charges
    const oldBedStartDate = oldBedUtilization.allocatedFrom;
    const oldBedEndDate = oldBedUtilization.allocatedTo;
    const oldBedDays = Math.ceil((oldBedEndDate - oldBedStartDate) / (1000 * 60 * 60 * 24));
    const oldBedCharges = oldBedDays * oldBed.pricePerDay;

    // Update old bed
    oldBed.status = 'available';
    oldBed.currentPatient = null;
    oldBed.currentAdmission = null;
    await oldBed.save();

    // Update new bed
    newBed.status = 'occupied';
    newBed.currentPatient = admission.patient;
    newBed.currentAdmission = admissionId;
    newBed.lastOccupied = new Date();
    await newBed.save();

    // Add bed allocation record to admission
    if (!admission.bedAllocations) {
      admission.bedAllocations = [];
    }

    admission.bedAllocations.push(oldBedUtilization);

    // Update current bed reference
    admission.bed = newBedId;
    admission.transferHistory = admission.transferHistory || [];
    admission.transferHistory.push({
      fromBed: oldBed._id,
      toBed: newBed._id,
      fromWard: oldBed.ward,
      toWard: newBed.ward,
      transferDate,
      transferReason,
      transferredBy: req.user._id
    });

    await admission.save();

    // Update invoice with new charges
    const invoice = await Invoice.findOne({
      admission: admissionId,
      status: { $in: ['draft', 'pending'] }
    });

    if (invoice) {
      // Find and update bed charge item for old bed
      const oldBedItemIndex = invoice.items.findIndex(
        item => item.description.includes(oldBed.bedNumber)
      );

      if (oldBedItemIndex !== -1) {
        invoice.items[oldBedItemIndex].amount = oldBedCharges;
        invoice.items[oldBedItemIndex].quantity = oldBedDays;
        invoice.items[oldBedItemIndex].description = 
          `Bed charges - ${oldBed.bedType} (${oldBed.bedNumber}) - ${oldBedDays} days`;
      } else {
        // Add if not found
        invoice.items.push({
          description: `Bed charges - ${oldBed.bedType} (${oldBed.bedNumber}) - ${oldBedDays} days`,
          category: 'bed_charges',
          quantity: oldBedDays,
          unitPrice: oldBed.pricePerDay,
          discount: 0,
          tax: 0,
          amount: oldBedCharges
        });
      }

      // Add new bed charge item
      invoice.items.push({
        description: `Bed charges - ${newBed.bedType} (${newBed.bedNumber})`,
        category: 'bed_charges',
        quantity: 0, // Will be calculated on discharge
        unitPrice: newBed.pricePerDay,
        discount: 0,
        tax: 0,
        amount: 0
      });

      // Recalculate totals
      invoice.subtotal = invoice.items.reduce((sum, item) => sum + item.amount, 0);
      invoice.totalAmount = invoice.subtotal + invoice.totalTax - invoice.discountAmount;
      invoice.dueAmount = invoice.totalAmount - invoice.paidAmount;

      await invoice.save();
    }

    // Update patient's assigned bed
    await Patient.findByIdAndUpdate(
      admission.patient,
      { assignedBed: newBedId },
      { new: true }
    );

    // Populate response
    const updatedAdmission = await Admission.findById(admissionId)
      .populate('patient', 'firstName lastName patientId phone')
      .populate('bed')
      .populate({
        path: 'transferHistory.transferredBy',
        select: 'firstName lastName email'
      });

    // Emit notifications
    emitBedUpdate(oldBed);
    emitBedUpdate(newBed);

    const patient = await Patient.findById(admission.patient);
    emitNotification({
      type: 'transfer',
      title: 'Patient Transferred',
      message: `${patient.firstName} ${patient.lastName} transferred from bed ${oldBed.bedNumber} to ${newBed.bedNumber}`,
      data: { admissionId, oldBedId: oldBed._id, newBedId }
    });

    res.json({
      success: true,
      message: 'Patient transferred successfully',
      data: {
        admission: updatedAdmission,
        oldBedCharges,
        oldBedDays
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATIENT DISCHARGE FLOW
 * - Close current bed allocation
 * - Calculate final charges
 * - Finalize invoice
 * - Update admission status
 * - Release bed
 */

// @desc    Discharge patient from admission
// @route   POST /api/admissions/:admissionId/discharge
// @access  Private
exports.dischargePatient = async (req, res, next) => {
  try {
    const { admissionId } = req.params;
    const { dischargeReason, notes, dischargingDoctorId } = req.body;

    // Get admission
    const admission = await Admission.findById(admissionId);
    if (!admission) {
      throw new AppError('Admission not found', 404);
    }

    if (admission.status !== 'ADMITTED') {
      throw new AppError('Admission is not in ADMITTED status', 400);
    }

    const dischargeDate = new Date();

    // Get current bed
    const currentBed = await Bed.findById(admission.bed);
    if (!currentBed) {
      throw new AppError('Current bed not found', 404);
    }

    // Create final bed utilization record
    const lastAllocationStart = 
      admission.bedAllocations?.length > 0 
        ? admission.bedAllocations[admission.bedAllocations.length - 1].allocatedTo 
        : admission.admissionDate;

    const finalBedUtilization = {
      bed: currentBed._id,
      admission: admissionId,
      allocatedFrom: lastAllocationStart,
      allocatedTo: dischargeDate,
      pricePerDay: currentBed.pricePerDay,
      status: 'RELEASED'
    };

    // Calculate final bed charges
    const finalBedDays = Math.ceil((dischargeDate - lastAllocationStart) / (1000 * 60 * 60 * 24));
    const finalBedCharges = finalBedDays * currentBed.pricePerDay;

    // Add final bed allocation to history
    if (!admission.bedAllocations) {
      admission.bedAllocations = [];
    }
    admission.bedAllocations.push(finalBedUtilization);

    // Update admission status
    admission.status = 'DISCHARGED';
    admission.actualDischargeDate = dischargeDate;
    admission.dischargingDoctor = dischargingDoctorId;
    admission.dischargeNotes = notes;

    await admission.save();

    // Update bed status
    currentBed.status = 'cleaning';
    currentBed.currentPatient = null;
    currentBed.currentAdmission = null;
    currentBed.lastCleaned = null; // Reset for cleaning
    await currentBed.save();

    // Update patient
    await Patient.findByIdAndUpdate(
      admission.patient,
      {
        assignedBed: null,
        currentAdmission: null,
        admissionStatus: 'DISCHARGED'
      },
      { new: true }
    );

    // Finalize invoice with all charges
    const invoice = await Invoice.findOne({
      admission: admissionId,
      status: { $in: ['draft', 'pending'] }
    });

    if (invoice) {
      // Update or add final bed charge
      const bedChargeIndex = invoice.items.findIndex(
        item => item.category === 'bed_charges' && 
                 item.description.includes(currentBed.bedNumber) &&
                 !item.description.includes(' - ')
      );

      if (bedChargeIndex !== -1) {
        invoice.items[bedChargeIndex].amount = finalBedCharges;
        invoice.items[bedChargeIndex].quantity = finalBedDays;
        invoice.items[bedChargeIndex].description = 
          `Bed charges - ${currentBed.bedType} (${currentBed.bedNumber}) - ${finalBedDays} days`;
      } else {
        // Add new bed charge item
        invoice.items.push({
          description: `Bed charges - ${currentBed.bedType} (${currentBed.bedNumber}) - ${finalBedDays} days`,
          category: 'bed_charges',
          quantity: finalBedDays,
          unitPrice: currentBed.pricePerDay,
          discount: 0,
          tax: 0,
          amount: finalBedCharges
        });
      }

      // Recalculate totals
      invoice.subtotal = invoice.items.reduce((sum, item) => sum + item.amount, 0);
      invoice.totalAmount = invoice.subtotal + invoice.totalTax - invoice.discountAmount;
      invoice.dueAmount = invoice.totalAmount - invoice.paidAmount;
      invoice.status = 'pending'; // Change from draft to pending

      // Generate invoice number if not exists
      if (!invoice.invoiceNumber) {
        const invoiceCount = await Invoice.countDocuments({ status: { $ne: 'draft' } });
        invoice.invoiceNumber = `INV-${Date.now()}-${invoiceCount + 1}`;
      }

      await invoice.save();
    }

    // Populate response
    const updatedAdmission = await Admission.findById(admissionId)
      .populate('patient', 'firstName lastName patientId phone')
      .populate('bed')
      .populate('dischargingDoctor');

    // Emit notifications
    emitBedUpdate(currentBed);

    const patient = await Patient.findById(admission.patient);
    emitNotification({
      type: 'discharge',
      title: 'Patient Discharged',
      message: `${patient.firstName} ${patient.lastName} discharged from bed ${currentBed.bedNumber}`,
      data: { admissionId, bedId: currentBed._id }
    });

    res.json({
      success: true,
      message: 'Patient discharged successfully',
      data: {
        admission: updatedAdmission,
        invoice: invoice?._id,
        totalBedCharges: admission.bedAllocations.reduce((sum, bed) => {
          const days = Math.ceil((bed.allocatedTo - bed.allocatedFrom) / (1000 * 60 * 60 * 24));
          return sum + (days * bed.pricePerDay);
        }, 0)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all admissions
// @route   GET /api/admissions
// @access  Private
exports.getAdmissions = async (req, res, next) => {
  try {
    const { patientId, status, bedId, page = 1, limit = 20 } = req.query;

    const query = {};
    if (patientId) query.patient = patientId;
    if (status) query.status = status;
    if (bedId) query.bed = bedId;

    const total = await Admission.countDocuments(query);
    const admissions = await Admission.find(query)
      .populate('patient', 'firstName lastName patientId phone')
      .populate('bed', 'bedNumber bedType ward')
      .populate('admittingDoctor')
      .populate('attendingDoctors')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ admissionDate: -1 });

    res.json({
      success: true,
      data: {
        admissions,
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

// @desc    Get single admission
// @route   GET /api/admissions/:id
// @access  Private
exports.getAdmission = async (req, res, next) => {
  try {
    const admission = await Admission.findById(req.params.id)
      .populate('patient')
      .populate('bed')
      .populate('admittingDoctor')
      .populate('attendingDoctors')
      .populate({
        path: 'transferHistory.transferredBy',
        select: 'firstName lastName email'
      });

    if (!admission) {
      throw new AppError('Admission not found', 404);
    }

    // Get associated invoice
    const invoice = await Invoice.findOne({ admission: req.params.id });

    res.json({
      success: true,
      data: { 
        admission,
        invoice: invoice?._id
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get admission statistics
// @route   GET /api/admissions/stats
// @access  Private
exports.getAdmissionStats = async (req, res, next) => {
  try {
    const total = await Admission.countDocuments();
    const admitted = await Admission.countDocuments({ status: 'ADMITTED' });
    const discharged = await Admission.countDocuments({ status: 'DISCHARGED' });
    const transferred = await Admission.countDocuments({ transferHistory: { $exists: true, $not: { $size: 0 } } });

    // By admission type
    const byType = await Admission.aggregate([
      {
        $group: {
          _id: '$admissionType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Average length of stay
    const avgLOS = await Admission.aggregate([
      {
        $match: { status: 'DISCHARGED' }
      },
      {
        $project: {
          lengthOfStay: {
            $divide: [
              { $subtract: ['$actualDischargeDate', '$admissionDate'] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avg: { $avg: '$lengthOfStay' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        total,
        admitted,
        discharged,
        transferred,
        occupancyRate: total > 0 ? ((admitted / (admitted + discharged)) * 100).toFixed(1) : 0,
        avgLengthOfStay: avgLOS[0]?.avg.toFixed(1) || 0,
        byType
      }
    });
  } catch (error) {
    next(error);
  }
};
