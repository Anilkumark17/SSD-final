const express = require('express');
const Patient = require('../models/Patient');
const Bed = require('../models/Bed');
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleAuth');

const router = express.Router();

// @route   GET /api/patients
// @desc    Get all patients
// @access  Private - HOSPITAL_ADMIN, ICU_MANAGER only
router.get('/', protect, checkRole(['HOSPITAL_ADMIN', 'ICU_MANAGER']), async (req, res) => {
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
// @access  Private - ICU_MANAGER, HOSPITAL_ADMIN
router.post('/', protect, checkRole(['ICU_MANAGER', 'HOSPITAL_ADMIN']), async (req, res) => {
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
// @access  Private - ICU_MANAGER, HOSPITAL_ADMIN
router.post('/:id/discharge', protect, checkRole(['ICU_MANAGER', 'HOSPITAL_ADMIN']), async (req, res) => {
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
// @access  Private - HOSPITAL_ADMIN, ICU_MANAGER
router.post('/:id/transfer', protect, checkRole(['HOSPITAL_ADMIN', 'ICU_MANAGER']), async (req, res) => {
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

    // Update patient - keep status as 'admitted' (not 'transferred')
    patient.assignedBed = newBedId;
    // Note: patient.status remains 'admitted' - only discharge changes it to 'discharged'
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

// @route   PUT /api/patients/:id
// @desc    Update patient details
// @access  Private - HOSPITAL_ADMIN only
router.put('/:id', protect, checkRole(['HOSPITAL_ADMIN']), async (req, res) => {
  try {
    const { name, age, priority, expectedDischargeDate, department } = req.body;
    
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    if (name) patient.name = name;
    if (age) patient.age = age;
    if (priority) patient.priority = priority;
    if (department) patient.department = department;
    if (expectedDischargeDate) patient.expectedDischargeDate = expectedDischargeDate;

    await patient.save();

    res.status(200).json({
      success: true,
      message: 'Patient updated successfully',
      patient
    });
  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({ success: false, message: 'Error updating patient' });
  }
});

// @route   POST /api/patients/:id/surgeries
// @desc    Schedule a surgery
// @access  Private - HOSPITAL_ADMIN only
router.post('/:id/surgeries', protect, checkRole(['HOSPITAL_ADMIN']), async (req, res) => {
  try {
    const { procedureName, date, time, surgeon, notes } = req.body;
    
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    patient.surgeries.push({
      procedureName,
      date,
      time,
      surgeon,
      notes,
      status: 'scheduled'
    });

    await patient.save();

    res.status(200).json({
      success: true,
      message: 'Surgery scheduled successfully',
      patient
    });
  } catch (error) {
    console.error('Schedule surgery error:', error);
    res.status(500).json({ success: false, message: 'Error scheduling surgery' });
  }
});

// @route   DELETE /api/patients/:id
// @desc    Delete patient record
// @access  Private - HOSPITAL_ADMIN only
router.delete('/:id', protect, checkRole(['HOSPITAL_ADMIN']), async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // Free up bed if assigned
    if (patient.assignedBed) {
      const bed = await Bed.findById(patient.assignedBed);
      if (bed) {
        bed.status = 'cleaning';
        bed.currentPatient = null;
        await bed.save();
        
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

    await patient.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Patient deleted successfully'
    });
  } catch (error) {
    console.error('Delete patient error:', error);
    res.status(500).json({ success: false, message: 'Error deleting patient' });
  }
});

module.exports = router;
