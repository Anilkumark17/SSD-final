const express = require('express');
const EmergencyRequest = require('../models/EmergencyRequest');
const Bed = require('../models/Bed');
const Patient = require('../models/Patient');
const Ward = require('../models/Ward');
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleAuth');
const { recommendBed } = require('../utils/bedRecommendation');

const router = express.Router();

// @route   GET /api/emergency-requests
// @desc    Get all emergency requests
// @access  Private - ICU_MANAGER, HOSPITAL_ADMIN
router.get('/', protect, checkRole(['ICU_MANAGER', 'HOSPITAL_ADMIN', 'ER_STAFF']), async (req, res) => {
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
router.post('/', protect, checkRole(['ER_STAFF', 'HOSPITAL_ADMIN']), async (req, res) => {
  try {
    const {
      patientName, urgency, preferredWard,
      requiredEquipment, notes, isEmergencyMode,
      age, gender, condition, priority,
      selectedBedId
    } = req.body;

    // Find recommended bed (or use selected)
    let finalBedId = selectedBedId;
    let recommendedBed = null;

    if (!finalBedId) {
      if (isEmergencyMode) {
        const { recommendBedGlobal } = require('../utils/bedRecommendation');
        recommendedBed = await recommendBedGlobal(requiredEquipment);
        if (recommendedBed) finalBedId = recommendedBed._id;
      } else {
        recommendedBed = await recommendBed(preferredWard, requiredEquipment);
      }
    }

    let requestStatus = 'pending';
    let assignedBedId = null;
    let resolvedAt = null;

    // Handle Emergency Mode (Instant Admission)
    if (isEmergencyMode && finalBedId) {
      const newPatient = await Patient.create({
        name: patientName,
        age: age || 0,
        gender: gender || 'Other',
        department: 'ER',
        reasonForAdmission: condition || notes || 'Emergency Admission',
        priority: priority || urgency || 'critical',
        assignedBed: finalBedId,
        status: 'admitted',
        admittedAt: Date.now()
      });

      const bed = await Bed.findByIdAndUpdate(finalBedId, {
        status: 'occupied',
        currentPatient: newPatient._id
      });

      requestStatus = 'assigned';
      assignedBedId = finalBedId;
      resolvedAt = Date.now();

      const io = req.app.get('io');
      io.emit('patient:admitted', {
        patientId: newPatient._id,
        name: newPatient.name,
        bedId: finalBedId,
        bedNumber: bed.bedNumber,
        ward: bed.ward
      });

      io.emit('bed:updated', {
        bedId: finalBedId,
        status: 'occupied',
        ward: bed.ward,
        currentPatient: newPatient._id
      });
    }

    const request = await EmergencyRequest.create({
      patientName,
      urgency: urgency || 'critical',
      preferredWard: isEmergencyMode ? 'Emergency' : preferredWard,
      requiredEquipment,
      notes,
      isEmergencyMode: !!isEmergencyMode,
      status: requestStatus,
      assignedBed: assignedBedId,
      resolvedAt,
      requestedBy: req.user._id,
      recommendedBed: recommendedBed ? recommendedBed._id : null
    });

    const populatedRequest = await EmergencyRequest.findById(request._id)
      .populate('requestedBy', 'name')
      .populate('recommendedBed', 'bedNumber ward')
      .populate('assignedBed', 'bedNumber ward');

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

// @route   PATCH /api/emergency-requests/:id/approve
// @desc    Approve emergency request (Hospital Admin)
// @access  Private - HOSPITAL_ADMIN
router.patch('/:id/approve', protect, checkRole(['HOSPITAL_ADMIN']), async (req, res) => {
  try {
    const request = await EmergencyRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request already processed' });
    }

    // Determine Bed ID
    // The frontend must send assignedBedId. We can fallback to request.assignedBed if it was already set (e.g. during creation)
    const { assignedBedId } = req.body;
    let targetBedId = assignedBedId || request.assignedBed;

    if (!targetBedId) {
        return res.status(400).json({ 
            success: false, 
            message: 'Please select a bed before approving.' 
        });
    }

    // Verify bed availability if it's a new assignment
    const bedToCheck = await Bed.findById(targetBedId);
    if (!bedToCheck) {
        return res.status(404).json({ success: false, message: 'Selected bed not found' });
    }
    
    // If we are assigning a new bed (different from what might have been tentatively assigned), check if it's available
    if (targetBedId !== request.assignedBed?.toString() && bedToCheck.status !== 'available' && bedToCheck.status !== 'reserved') {
         return res.status(400).json({ 
            success: false, 
            message: `Bed ${bedToCheck.bedNumber} is not available (Status: ${bedToCheck.status})` 
        });
    }

    // 1. Create Patient Record
    const newPatient = await Patient.create({
      name: request.patientName,
      age: request.age || 0, // Use request age if available
      gender: request.gender || 'Other',
      department: 'ER',
      reasonForAdmission: request.notes || 'Emergency Admission',
      priority: request.urgency || 'critical',
      assignedBed: targetBedId,
      status: 'admitted',
      admittedAt: Date.now()
    });

    // 2. Update Bed Status
    const bed = await Bed.findById(targetBedId);
    if (bed) {
      bed.status = 'occupied';
      bed.currentPatient = newPatient._id;
      await bed.save();
    }

    // 3. Update Request Status
    request.status = 'assigned'; // or 'approved'
    request.assignedBed = targetBedId;
    request.resolvedAt = Date.now();
    await request.save();

    // 4. Emit Events
    const io = req.app.get('io');
    io.emit('patient:admitted', {
      patientId: newPatient._id,
      name: newPatient.name,
      bedId: bed?._id,
      bedNumber: bed?.bedNumber,
      ward: bed?.ward
    });

    if (bed) {
      io.emit('bed:updated', {
        bedId: bed._id,
        status: 'occupied',
        ward: bed.ward,
        currentPatient: newPatient._id
      });
    }

    io.emit('emergency:assigned', { requestId: request._id, bedId: bed?._id });

    res.status(200).json({ success: true, request });
  } catch (error) {
    console.error('Approve emergency request error:', error);
    res.status(500).json({ success: false, message: 'Error approving request: ' + error.message });
  }
});

// @route   PATCH /api/emergency-requests/:id/assign
// @desc    Assign bed to emergency request (Legacy/Manual)
// @access  Private - ICU_MANAGER, HOSPITAL_ADMIN
router.patch('/:id/assign', protect, checkRole(['ICU_MANAGER', 'HOSPITAL_ADMIN']), async (req, res) => {
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
// @access  Private - ER_STAFF, ICU_MANAGER, HOSPITAL_ADMIN
router.patch('/:id/cancel', protect, checkRole(['ER_STAFF', 'ICU_MANAGER', 'HOSPITAL_ADMIN']), async (req, res) => {
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
    res.status(500).json({
      success: false,
      message: 'Error cancelling request'
    });
  }
});

// @route   PATCH /api/emergency-requests/:id/reject
// @desc    Reject emergency request
// @access  Private - HOSPITAL_ADMIN
router.patch('/:id/reject', protect, checkRole(['HOSPITAL_ADMIN']), async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const request = await EmergencyRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Request already processed'
      });
    }

    request.status = 'rejected';
    request.notes = rejectionReason ? (request.notes ? `${request.notes} | Rejected: ${rejectionReason}` : `Rejected: ${rejectionReason}`) : request.notes;
    request.resolvedAt = Date.now();
    await request.save();

    // Emit socket event
    const io = req.app.get('io');
    io.emit('emergency:assigned', { requestId: request._id, status: 'rejected' });

    res.status(200).json({
      success: true,
      message: 'Request rejected',
      request
    });
  } catch (error) {
    console.error('Reject emergency request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting request'
    });
  }
});

// @route   POST /api/emergency-requests/check-availability
// @desc    Check for bed availability without creating a request
// @access  Private - ER_STAFF, HOSPITAL_ADMIN
router.post('/check-availability', protect, checkRole(['ER_STAFF', 'HOSPITAL_ADMIN']), async (req, res) => {
  try {
    const { preferredWard, requiredEquipment, isEmergencyMode } = req.body;

    let availableBeds = [];
    let recommendedBed = null;

    if (isEmergencyMode) {
      // 1. Get Ward IDs for Emergency and ICU
      // Note: Adjust names if your DB uses 'ER' instead of 'Emergency'
      const targetWards = await Ward.find({
        $or: [{ name: 'Emergency' }, { name: 'ER' }, { name: 'ICU' }, { type: 'ICU' }, { type: 'ER' }]
      });
      const targetWardIds = targetWards.map(w => w._id);

      // 2. Fetch available beds in these wards
      const beds = await Bed.find({
        ward: { $in: targetWardIds },
        status: 'available'
      })
        .populate('ward')
        .sort({ bedNumber: 1 });

      // 3. Prioritize Emergency/ER ward beds
      availableBeds = beds.sort((a, b) => {
        const isAEmergency = a.ward.name === 'Emergency' || a.ward.name === 'ER' || a.ward.type === 'ER';
        const isBEmergency = b.ward.name === 'Emergency' || b.ward.name === 'ER' || b.ward.type === 'ER';

        if (isAEmergency && !isBEmergency) return -1;
        if (!isAEmergency && isBEmergency) return 1;
        return 0;
      });

      // Recommend the first one (Best match logic can be refined if needed)
      if (availableBeds.length > 0) {
        // Filter by equipment if needed, or just pick first
        if (requiredEquipment && requiredEquipment.length > 0) {
          // Note: equipmentType is on the bed document
          recommendedBed = availableBeds.find(b => requiredEquipment.every(eq => b.equipmentType.includes(eq))) || availableBeds[0];
        } else {
          recommendedBed = availableBeds[0];
        }
      }
    } else {
      recommendedBed = await recommendBed(preferredWard, requiredEquipment);
      if (recommendedBed) availableBeds = [recommendedBed];
    }

    res.status(200).json({
      success: true,
      available: availableBeds.length > 0,
      recommendedBed: recommendedBed ? {
        id: recommendedBed._id,
        bedNumber: recommendedBed.bedNumber,
        ward: recommendedBed.ward,
        type: recommendedBed.type
      } : null,
      availableBeds: availableBeds.map(b => ({
        id: b._id,
        bedNumber: b.bedNumber,
        ward: b.ward,
        type: b.type
      }))
    });
  } catch (error) {
    console.error('Check availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking availability'
    });
  }
});

module.exports = router;
