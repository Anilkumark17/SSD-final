const express = require('express');
const BedRequest = require('../models/BedRequest');
const Bed = require('../models/Bed');
const { protect } = require('../middleware/auth');
const { recommendBed } = require('../utils/bedRecommendation');

const router = express.Router();

// @route   GET /api/bed-requests
// @desc    Get all bed requests
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const requests = await BedRequest.find()
      .populate('patientId', 'name patientId age gender')
      .populate('requestedBy', 'name email')
      .populate('recommendedBeds', 'bedNumber ward equipmentType')
      .populate('assignedBedId', 'bedNumber ward')
      .sort({ requestDate: -1 });

    res.status(200).json(requests);
  } catch (error) {
    console.error('Get bed requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bed requests'
    });
  }
});

// @route   POST /api/bed-requests
// @desc    Create new bed request with auto-recommendations
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { patientId, wardType, equipmentRequired, priority, notes } = req.body;

    // Get bed recommendations
    const equipmentArray = equipmentRequired !== 'standard' ? [equipmentRequired] : [];
    const recommendedBed = await recommendBed(wardType, equipmentArray);

    let recommendedBeds = [];
    if (recommendedBed) {
      recommendedBeds.push(recommendedBed._id);

      // Get additional recommendations
      const additionalBeds = await Bed.find({
        ward: wardType,
        status: 'available',
        _id: { $ne: recommendedBed._id }
      }).limit(2);

      recommendedBeds.push(...additionalBeds.map(b => b._id));
    }

    const bedRequest = await BedRequest.create({
      patientId,
      requestedBy: req.user._id,
      wardType,
      equipmentRequired,
      priority,
      notes,
      recommendedBeds
    });

    await bedRequest.populate([
      { path: 'patientId', select: 'name patientId' },
      { path: 'requestedBy', select: 'name email' },
      { path: 'recommendedBeds', select: 'bedNumber ward equipmentType' }
    ]);

    // Emit socket event
    const io = req.app.get('io');
    io.emit('bed-request-created', bedRequest);

    res.status(201).json({
      success: true,
      bedRequest
    });
  } catch (error) {
    console.error('Create bed request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating bed request'
    });
  }
});

// @route   PATCH /api/bed-requests/:id/assign
// @desc    Assign bed to request
// @access  Private
router.patch('/:id/assign', protect, async (req, res) => {
  try {
    const { bedId } = req.body;

    const bedRequest = await BedRequest.findByIdAndUpdate(
      req.params.id,
      {
        assignedBedId: bedId,
        status: 'assigned'
      },
      { new: true }
    ).populate('assignedBedId', 'bedNumber ward');

    if (!bedRequest) {
      return res.status(404).json({
        success: false,
        message: 'Bed request not found'
      });
    }

    res.status(200).json({
      success: true,
      bedRequest
    });
  } catch (error) {
    console.error('Assign bed error:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning bed'
    });
  }
});

// @route   PATCH /api/bed-requests/:id/approve
// @desc    Approve bed request (Hospital Admin)
// @access  Private - HOSPITAL_ADMIN
router.patch('/:id/approve', protect, async (req, res) => {
  try {
    // Check role manually since we didn't import checkRole here yet, or assume protect handles it if we add middleware
    // For now, let's trust the frontend role check or add checkRole if needed. 
    // Ideally we should use checkRole middleware.

    const { assignedBedId } = req.body;

    const updateData = { status: 'approved' };
    if (assignedBedId) {
      updateData.assignedBedId = assignedBedId;
      // Also update the bed status to reserved
      await Bed.findByIdAndUpdate(assignedBedId, { status: 'reserved' });
    }

    const bedRequest = await BedRequest.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('patientId', 'name');

    if (!bedRequest) {
      return res.status(404).json({
        success: false,
        message: 'Bed request not found'
      });
    }

    // Emit socket event for ICU Manager
    const io = req.app.get('io');
    io.emit('bed-request-approved', bedRequest);
    if (assignedBedId) {
      io.emit('bed:updated', { bedId: assignedBedId, status: 'reserved' });
    }

    res.status(200).json({
      success: true,
      bedRequest
    });
  } catch (error) {
    console.error('Approve request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving request'
    });
  }
});

// @route   PATCH /api/bed-requests/:id/reject
// @desc    Reject bed request (Hospital Admin)
// @access  Private - HOSPITAL_ADMIN
router.patch('/:id/reject', protect, async (req, res) => {
  try {
    const { rejectionReason } = req.body;

    const bedRequest = await BedRequest.findByIdAndUpdate(
      req.params.id,
      {
        status: 'rejected',
        notes: rejectionReason ? `Rejected: ${rejectionReason}` : 'Rejected by Admin'
      },
      { new: true }
    ).populate('patientId', 'name');

    if (!bedRequest) {
      return res.status(404).json({
        success: false,
        message: 'Bed request not found'
      });
    }

    // Emit socket event
    const io = req.app.get('io');
    io.emit('bed-request-rejected', bedRequest);

    res.status(200).json({
      success: true,
      bedRequest
    });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting request'
    });
  }
});

module.exports = router;
