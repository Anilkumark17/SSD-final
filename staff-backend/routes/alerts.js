const express = require('express');
const Alert = require('../models/Alert');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/alerts
// @desc    Get all alerts with optional filters
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { isRead } = req.query;
    
    const query = {};
    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }

    const alerts = await Alert.find(query)
      .populate('relatedBed', 'bedNumber ward')
      .populate('relatedPatient', 'name patientId')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json(alerts);
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching alerts'
    });
  }
});

// @route   PATCH /api/alerts/:id/read
// @desc    Mark alert as read
// @access  Private
router.patch('/:id/read', protect, async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    res.status(200).json({
      success: true,
      alert
    });
  } catch (error) {
    console.error('Mark alert as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating alert'
    });
  }
});

// @route   POST /api/alerts
// @desc    Create new alert (internal use)
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const alert = await Alert.create(req.body);

    // Emit socket event
    const io = req.app.get('io');
    io.emit('alert-created', alert);

    res.status(201).json({
      success: true,
      alert
    });
  } catch (error) {
    console.error('Create alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating alert'
    });
  }
});

module.exports = router;
