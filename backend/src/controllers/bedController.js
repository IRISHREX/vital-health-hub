const Bed = require('../models/Bed');

// Create bed
exports.createBed = async (req, res) => {
  try {
    const bed = new Bed(req.body);
    await bed.save();

    res.status(201).json({
      success: true,
      data: bed
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get all beds
exports.getBeds = async (req, res) => {
  try {
    const { ward, status, type, floor } = req.query;
    const filter = {};

    if (ward) filter.ward = ward;
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (floor) filter.floor = floor;

    const beds = await Bed.find(filter)
      .populate('currentPatient', 'firstName lastName patientId')
      .sort({ bedNumber: 1 });

    res.json({
      success: true,
      data: {
        beds,
        count: beds.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get single bed
exports.getBedById = async (req, res) => {
  try {
    const bed = await Bed.findById(req.params.id)
      .populate('currentPatient', 'firstName lastName patientId');

    if (!bed) {
      return res.status(404).json({
        success: false,
        message: 'Bed not found'
      });
    }

    res.json({
      success: true,
      data: bed
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update bed
exports.updateBed = async (req, res) => {
  try {
    const bed = await Bed.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!bed) {
      return res.status(404).json({
        success: false,
        message: 'Bed not found'
      });
    }

    res.json({
      success: true,
      data: bed
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Delete bed
exports.deleteBed = async (req, res) => {
  try {
    const bed = await Bed.findById(req.params.id);

    if (!bed) {
      return res.status(404).json({
        success: false,
        message: 'Bed not found'
      });
    }

    if (bed.status === 'occupied') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete an occupied bed'
      });
    }

    await Bed.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Bed deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get bed statistics
exports.getBedStats = async (req, res) => {
  try {
    const stats = await Bed.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const wardStats = await Bed.aggregate([
      {
        $group: {
          _id: { ward: '$ward', status: '$status' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        byStatus: stats,
        byWard: wardStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
