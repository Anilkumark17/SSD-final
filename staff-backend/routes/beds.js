const express = require('express');
const Bed = require('../models/Bed');
const { protect } = require('../middleware/auth');
const { recommendBed } = require('../utils/bedRecommendation');

const router = express.Router();

// @route   GET /api/beds
// @desc    Get all beds with optional filters
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { ward, status, equipment } = req.query;
    
    const query = {};
    
    if (ward) query.ward = ward;
    if (status) query.status = status;
    if (equipment) query.equipmentType = { $in: [equipment] };

    const beds = await Bed.find(query)
      .populate('ward', 'name type')
      .populate('currentPatient', 'name patientId admittedAt')
      .sort({ ward: 1, bedNumber: 1 });

    res.status(200).json(beds);
  } catch (error) {
    console.error('Get beds error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching beds'
    });
  }
});

// @route   GET /api/beds/available
// @desc    Get all available beds
// @access  Private
router.get('/available', protect, async (req, res) => {
  try {
    const beds = await Bed.find({ status: 'available' })
      .sort({ ward: 1, bedNumber: 1 });

    res.status(200).json(beds);
  } catch (error) {
    console.error('Get available beds error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available beds'
    });
  }
});

// @route   POST /api/beds/recommend
// @desc    Get recommended beds based on criteria
// @access  Private
router.post('/recommend', protect, async (req, res) => {
  try {
    const { wardType, equipmentType, priority } = req.body;
    
    // Get recommended bed
    const recommendedBed = await recommendBed(wardType, equipmentType ? [equipmentType] : []);
    
    if (!recommendedBed) {
      return res.status(404).json({
        success: false,
        message: 'No suitable beds available'
      });
    }

    // Get additional recommendations (up to 3)
    const additionalBeds = await Bed.find({
      ward: wardType,
      status: 'available',
      _id: { $ne: recommendedBed._id }
    }).limit(2);

    const recommendations = [recommendedBed, ...additionalBeds];

    res.status(200).json(recommendations);
  } catch (error) {
    console.error('Bed recommendation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting bed recommendations'
    });
  }
});

// @route   PATCH /api/beds/:id
// @desc    Update bed status
// @access  Private
router.patch('/:id', protect, async (req, res) => {
  try {
    const { status, estimatedAvailableTime } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Please provide status'
      });
    }

    const bed = await Bed.findById(req.params.id);
    
    if (!bed) {
      return res.status(404).json({
        success: false,
        message: 'Bed not found'
      });
    }

    // If bed is occupied, cannot change status directly to available without discharging patient
    if (status === 'available' && bed.currentPatient) {
      return res.status(400).json({
        success: false,
        message: 'Cannot mark bed as available while patient is assigned. Discharge patient first.'
      });
    }

    bed.status = status;
    
    // Set estimated available time for cleaning status
    if (status === 'cleaning' && estimatedAvailableTime) {
      bed.estimatedAvailableTime = estimatedAvailableTime;
    } else if (status !== 'cleaning') {
      bed.estimatedAvailableTime = null;
    }
    
    await bed.save();

    // Emit socket event
    const io = req.app.get('io');
    io.emit('bed:updated', {
      bedId: bed._id,
      status: bed.status,
      ward: bed.ward
    });

    // Check for occupancy alert
    if (status === 'occupied') {
      const totalBeds = await Bed.countDocuments({ ward: bed.ward });
      const occupiedBeds = await Bed.countDocuments({ ward: bed.ward, status: 'occupied' });
      const percentage = (occupiedBeds / totalBeds) * 100;

      if (percentage >= 90) {
        io.emit('alert:occupancy', {
          type: 'CRITICAL_OCCUPANCY',
          ward: bed.ward,
          percentage: Math.round(percentage),
          message: `Critical occupancy in ${bed.ward}: ${Math.round(percentage)}%`
        });
      }
    }

    res.status(200).json({
      success: true,
      bed
    });
  } catch (error) {
    console.error('Update bed error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating bed status'
    });
  }
});

module.exports = router;
