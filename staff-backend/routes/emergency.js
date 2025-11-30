const express = require('express');
const EmergencyRequest = require('../models/EmergencyRequest');
const Bed = require('../models/Bed');
const { protect } = require('../middleware/auth');
const { recommendBed } = require('../utils/bedRecommendation');

const router = express.Router();

// @route   GET /api/emergency-requests
// @desc    Get all emergency requests
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const requests = await EmergencyRequest.find()
      .populate('requestedBy', 'name')
      .populate('recommendedBed', 'bedNumber ward')
      .populate('assignedBed', 'bedNumber ward')
      .sort({ requestedAt: -1 });

    res.status(200).json(requests);
  } catch (error) {
    console.error('Get emergency requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching requests'
    });
  }
});

// @route   POST /api/emergency-requests
// @desc    Create new emergency request
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { 
      patientName, urgency, preferredWard, 
      requiredEquipment, notes 
    } = req.body;

    // Find recommended bed
    const recommendedBed = await recommendBed(preferredWard, requiredEquipment);

    const request = await EmergencyRequest.create({
      patientName,
      urgency,
      preferredWard,
      requiredEquipment,
      notes,
      requestedBy: req.user._id,
      recommendedBed: recommendedBed ? recommendedBed._id : null
    });

    const populatedRequest = await EmergencyRequest.findById(request._id)
      .populate('requestedBy', 'name')
      .populate('recommendedBed', 'bedNumber ward');

    // Emit socket event
    const io = req.app.get('io');
    io.emit('emergency:new', populatedRequest);

    res.status(201).json(populatedRequest);
  } catch (error) {
    console.error('Create emergency request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating request'
    });
  }
});

// @route   PATCH /api/emergency-requests/:id/assign
// @desc    Assign bed to emergency request
// @access  Private
router.patch('/:id/assign', protect, async (req, res) => {
  try {
    const { bedId } = req.body;
    
    const request = await EmergencyRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    const bed = await Bed.findById(bedId);
    if (!bed) {
      return res.status(404).json({
        success: false,
        message: 'Bed not found'
      });
    }

    if (bed.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: 'Bed is not available'
      });
    }

    // Update request
    request.status = 'assigned';
    request.assignedBed = bedId;
    request.resolvedAt = Date.now();
    await request.save();

    // Reserve the bed (status will be updated to 'occupied' when patient is formally admitted)
    bed.status = 'reserved';
    await bed.save();

    // Emit socket events
    const io = req.app.get('io');
    
    io.emit('emergency:assigned', {
      requestId: request._id,
      bedId: bed._id
    });

    io.emit('bed:updated', {
      bedId: bed._id,
      status: 'reserved',
      ward: bed.ward
    });

    res.status(200).json({
      success: true,
      request
    });
  } catch (error) {
    console.error('Assign bed error:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning bed'
    });
  }
});

// @route   PATCH /api/emergency-requests/:id/cancel
// @desc    Cancel emergency request
// @access  Private
router.patch('/:id/cancel', protect, async (req, res) => {
  try {
    const request = await EmergencyRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    request.status = 'cancelled';
    request.resolvedAt = Date.now();
    await request.save();

    // Emit socket event
    const io = req.app.get('io');
    io.emit('emergency:assigned', { requestId: request._id, status: 'cancelled' });

    res.status(200).json({
      success: true,
      message: 'Request cancelled'
    });
  } catch (error) {
    console.error('Cancel request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling request'
    });
  }
});

module.exports = router;
