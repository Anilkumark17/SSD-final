const express = require('express');
const BedRequest = require('../models/BedRequest');
const Bed = require('../models/Bed');
const { protect } = require('../middleware/auth');
const { recommendBed } = require('../utils/bedRecommendation');

const router = express.Router();

console.log('🔧 BedRequests routes loaded - reject endpoint available');

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
// @desc    Approve bed request and admit patient
// @access  Private - HOSPITAL_ADMIN
router.patch('/:id/approve', protect, async (req, res) => {
  try {
    const { assignedBedId } = req.body;
    const bedRequestId = req.params.id;

    console.log(`✅ Approving request ${bedRequestId} with bed ${assignedBedId}`);

    const bedRequest = await BedRequest.findById(bedRequestId);
    if (!bedRequest) {
      return res.status(404).json({ success: false, message: 'Bed request not found' });
    }

    // Determine bed ID: use passed ID or fallback to first recommendation
    let targetBedId = assignedBedId;
    if (!targetBedId && bedRequest.recommendedBeds && bedRequest.recommendedBeds.length > 0) {
      targetBedId = bedRequest.recommendedBeds[0];
    }

    if (!targetBedId) {
      return res.status(400).json({ 
        success: false, 
        message: 'No bed assigned. Please select a bed to approve this request.' 
      });
    }

    // Check if bed is actually available
    const bedToCheck = await Bed.findById(targetBedId);
    if (!bedToCheck) {
        return res.status(404).json({ success: false, message: 'Selected bed not found' });
    }

    // Allow if it's already assigned to this request (idempotency) or if it's available/reserved
    // If it's occupied by someone else, reject
    if (bedToCheck.status === 'occupied' && bedToCheck.currentPatient?.toString() !== bedRequest.patientId?.toString()) {
        return res.status(400).json({ 
            success: false, 
            message: `Bed ${bedToCheck.bedNumber} is already occupied.` 
        });
    }

    // 1. Update Bed Request
    bedRequest.status = 'approved';
    bedRequest.assignedBedId = targetBedId;
    bedRequest.fulfilledDate = Date.now();
    await bedRequest.save();

    // 2. Update Bed Status to Occupied
    const bed = await Bed.findById(targetBedId);
    if (bed) {
      bed.status = 'occupied';
      bed.currentPatient = bedRequest.patientId;
      await bed.save();
    }

    // 3. Update Patient Status
    const Patient = require('../models/Patient');
    await Patient.findByIdAndUpdate(bedRequest.patientId, {
      status: 'admitted',
      assignedBed: targetBedId,
      admittedAt: Date.now()
    });

    // Emit socket events
    const io = req.app.get('io');
    
    // Notify ICU Manager / Staff
    io.emit('bed-request-approved', bedRequest);
    
    // Update Bed Grid instantly
    io.emit('bed:updated', { 
      bedId: targetBedId, 
      status: 'occupied',
      ward: bed.ward 
    });

    // Notify that patient is admitted
    io.emit('patient:admitted', {
      patientId: bedRequest.patientId,
      bedId: targetBedId,
      ward: bed.ward
    });

    res.status(200).json({
      success: true,
      bedRequest,
      message: 'Request approved and patient admitted successfully'
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
  console.log('🚫 REJECT ENDPOINT HIT - ID:', req.params.id);
  console.log('🚫 Request body:', req.body);

  try {
    const { rejectionReason } = req.body;

    console.log('🚫 Finding bed request with ID:', req.params.id);
    const bedRequest = await BedRequest.findById(req.params.id);

    if (!bedRequest) {
      console.log('❌ Bed request not found');
      return res.status(404).json({
        success: false,
        message: 'Bed request not found'
      });
    }

    console.log('✅ Found bed request:', bedRequest._id);
    console.log('📝 Current status:', bedRequest.status);

    // Update the request
    bedRequest.status = 'rejected';
    bedRequest.notes = rejectionReason ? `Rejected: ${rejectionReason}` : 'Rejected by Admin';
    await bedRequest.save();

    console.log('✅ Bed request rejected successfully');

    await bedRequest.populate('patientId', 'name');

    // Emit socket event
    const io = req.app.get('io');
    io.emit('bed-request-rejected', bedRequest);

    res.status(200).json({
      success: true,
      bedRequest,
      message: 'Request rejected successfully'
    });
  } catch (error) {
    console.error('❌ Reject request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting request',
      error: error.message
    });
  }
});

module.exports = router;
