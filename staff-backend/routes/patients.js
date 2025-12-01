const express = require('express');
const Patient = require('../models/Patient');
const Bed = require('../models/Bed');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/patients
// @desc    Get all patients
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const patients = await Patient.find()
      .populate('assignedBed', 'bedNumber ward status')
      .populate({
        path: 'assignedBed',
        populate: {
          path: 'ward',
          select: 'name type'
        }
      })
      .sort({ admittedAt: -1 });

    res.status(200).json(patients);
  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching patients'
    });
  }
});

// @route   POST /api/patients
// @desc    Admit new patient and assign to bed
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { 
      name, age, gender, department, 
      reasonForAdmission, priority, bedId, expectedDischargeDate
    } = req.body;

    console.log('=== Patient Admission Request ===');
    console.log('Received data:', { name, age, gender, department, reasonForAdmission, priority, bedId, expectedDischargeDate });

    // Validate required fields
    if (!name || !age || !gender || !reasonForAdmission || !bedId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, age, gender, reasonForAdmission, bedId'
      });
    }

    // Validate priority enum
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    const patientPriority = priority || 'medium';
    if (!validPriorities.includes(patientPriority)) {
      return res.status(400).json({
        success: false,
        message: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`
      });
    }

    // Validate bed availability
    const bed = await Bed.findById(bedId).populate('ward');
    console.log('Bed lookup result:', bed ? `Found: ${bed.bedNumber}` : 'Not found');
    
    if (!bed) {
      return res.status(404).json({
        success: false,
        message: 'Selected bed not found'
      });
    }

    if (bed.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: `Selected bed is ${bed.status}, not available`
      });
    }

    // Create patient with expected discharge date
    const patientData = {
      name,
      age,
      gender,
      department: department || 'General',
      reasonForAdmission,
      priority: patientPriority,
      assignedBed: bedId,
      status: 'admitted'
    };

    // Add expected discharge date if provided
    if (expectedDischargeDate) {
      patientData.expectedDischargeDate = new Date(expectedDischargeDate);
    }

    const patient = await Patient.create(patientData);

    console.log('Patient created:', patient.patientId);
    if (patient.expectedDischargeDate) {
      console.log('Expected discharge:', patient.expectedDischargeDate);
    }

    // Update bed status
    bed.status = 'occupied';
    bed.currentPatient = patient._id;
    await bed.save();

    console.log('Bed updated to occupied');

    // Emit socket events
    const io = req.app.get('io');
    if (io) {
      io.emit('patient:admitted', {
        patientId: patient._id,
        patientIdNumber: patient.patientId,
        name: patient.name,
        bedId: bed._id,
        bedNumber: bed.bedNumber,
        ward: bed.ward
      });

      io.emit('bed:updated', {
        bedId: bed._id,
        status: 'occupied',
        ward: bed.ward,
        currentPatient: patient._id
      });

      // Check occupancy threshold and create alerts if needed
      const { checkOccupancyThreshold } = require('../services/alertService');
      await checkOccupancyThreshold(bed.ward._id || bed.ward, io);
    }

    // Populate and return
    const populatedPatient = await Patient.findById(patient._id)
      .populate({
        path: 'assignedBed',
        populate: { path: 'ward' }
      });

    res.status(201).json({
      success: true,
      patient: populatedPatient
    });
  } catch (error) {
    console.error('Admit patient error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error admitting patient'
    });
  }
});

// @route   POST /api/patients/:id/discharge
// @desc    Discharge patient and free up bed
// @access  Private
router.post('/:id/discharge', protect, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    if (patient.status === 'discharged') {
      return res.status(400).json({
        success: false,
        message: 'Patient is already discharged'
      });
    }

    // Update patient status
    patient.status = 'discharged';
    patient.dischargedAt = Date.now();
    
    // Free up the bed
    if (patient.assignedBed) {
      const bed = await Bed.findById(patient.assignedBed).populate('ward');
      if (bed) {
        bed.status = 'cleaning'; // Set to cleaning after discharge
        bed.currentPatient = null;
        bed.estimatedAvailableTime = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        await bed.save();

        console.log(`Bed ${bed.bedNumber} set to cleaning`);

        // Emit bed update
        const io = req.app.get('io');
        if (io) {
          io.emit('bed:updated', {
            bedId: bed._id,
            status: 'cleaning',
            ward: bed.ward,
            currentPatient: null
          });
        }
      }
    }

    await patient.save();

    // Emit patient update
    const io = req.app.get('io');
    if (io) {
      io.emit('patient:discharged', {
        patientId: patient._id,
        patientIdNumber: patient.patientId,
        name: patient.name
      });
    }

    res.status(200).json({
      success: true,
      message: 'Patient discharged successfully',
      patient
    });
  } catch (error) {
    console.error('Discharge patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Error discharging patient'
    });
  }
});

// @route   POST /api/patients/:id/transfer
// @desc    Transfer patient to different bed/ward
// @access  Private
router.post('/:id/transfer', protect, async (req, res) => {
  try {
    const { newBedId } = req.body;
    const patient = await Patient.findById(req.params.id);
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    if (patient.status !== 'admitted') {
      return res.status(400).json({
        success: false,
        message: 'Can only transfer admitted patients'
      });
    }

    // Validate new bed
    const newBed = await Bed.findById(newBedId).populate('ward');
    if (!newBed) {
      return res.status(404).json({
        success: false,
        message: 'New bed not found'
      });
    }

    if (newBed.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: 'New bed is not available'
      });
    }

    // Free up old bed
    if (patient.assignedBed) {
      const oldBed = await Bed.findById(patient.assignedBed).populate('ward');
      if (oldBed) {
        oldBed.status = 'cleaning';
        oldBed.currentPatient = null;
        await oldBed.save();

        // Emit old bed update
        const io = req.app.get('io');
        if (io) {
          io.emit('bed:updated', {
            bedId: oldBed._id,
            status: 'cleaning',
            ward: oldBed.ward,
            currentPatient: null
          });
        }
      }
    }

    // Assign new bed
    newBed.status = 'occupied';
    newBed.currentPatient = patient._id;
    await newBed.save();

    // Update patient
    patient.assignedBed = newBedId;
    patient.status = 'transferred';
    await patient.save();

    // Emit new bed update
    const io = req.app.get('io');
    if (io) {
      io.emit('bed:updated', {
        bedId: newBed._id,
        status: 'occupied',
        ward: newBed.ward,
        currentPatient: patient._id
      });

      io.emit('patient:transferred', {
        patientId: patient._id,
        patientIdNumber: patient.patientId,
        name: patient.name,
        newBedId: newBed._id,
        newBedNumber: newBed.bedNumber
      });
    }

    const populatedPatient = await Patient.findById(patient._id)
      .populate({
        path: 'assignedBed',
        populate: { path: 'ward' }
      });

    res.status(200).json({
      success: true,
      message: 'Patient transferred successfully',
      patient: populatedPatient
    });
  } catch (error) {
    console.error('Transfer patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Error transferring patient'
    });
  }
});

module.exports = router;
