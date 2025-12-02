const express = require('express');
const router = express.Router();

// Simulated in-memory storage for doctors
let doctors = [];

/**
 * POST /doctors
 * Create a new doctor profile
 */
router.post('/', (req, res) => {
  try {
    const { name, specialization, experience, phone, email, clinic, city, bio } = req.body;

    // Validation
    if (!name || !specialization || !experience || !phone || !email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, specialization, experience, phone, email',
      });
    }

    if (experience < 0) {
      return res.status(400).json({
        success: false,
        message: 'Experience cannot be negative.',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    // Create doctor object
    const doctor = {
      id: Date.now(),
      name,
      specialization,
      experience: Number(experience),
      phone,
      email,
      clinic: clinic || '',
      city: city || '',
      bio: bio || '',
      createdAt: new Date(),
    };

    doctors.push(doctor);

    res.status(201).json({
      success: true,
      message: 'Doctor profile created successfully.',
      data: doctor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating doctor profile.',
      error: error.message,
    });
  }
});

/**
 * GET /doctors
 * Retrieve all doctor profiles
 */
router.get('/', (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: doctors,
      count: doctors.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving doctor profiles.',
      error: error.message,
    });
  }
});

/**
 * GET /doctors/:id
 * Retrieve a specific doctor profile by ID
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const doctor = doctors.find(d => d.id === Number(id));

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: doctor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving doctor profile.',
      error: error.message,
    });
  }
});

/**
 * PUT /doctors/:id
 * Update a doctor profile
 */
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, specialization, experience, phone, email, clinic, city, bio } = req.body;

    const doctorIndex = doctors.findIndex(d => d.id === Number(id));

    if (doctorIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found.',
      });
    }

    // Validation
    if (experience !== undefined && experience < 0) {
      return res.status(400).json({
        success: false,
        message: 'Experience cannot be negative.',
      });
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address.',
        });
      }
    }

    // Update doctor
    doctors[doctorIndex] = {
      ...doctors[doctorIndex],
      ...(name && { name }),
      ...(specialization && { specialization }),
      ...(experience && { experience: Number(experience) }),
      ...(phone && { phone }),
      ...(email && { email }),
      ...(clinic && { clinic }),
      ...(city && { city }),
      ...(bio && { bio }),
      updatedAt: new Date(),
    };

    res.status(200).json({
      success: true,
      message: 'Doctor profile updated successfully.',
      data: doctors[doctorIndex],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating doctor profile.',
      error: error.message,
    });
  }
});

/**
 * DELETE /doctors/:id
 * Delete a doctor profile
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const doctorIndex = doctors.findIndex(d => d.id === Number(id));

    if (doctorIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found.',
      });
    }

    const deletedDoctor = doctors.splice(doctorIndex, 1);

    res.status(200).json({
      success: true,
      message: 'Doctor profile deleted successfully.',
      data: deletedDoctor[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting doctor profile.',
      error: error.message,
    });
  }
});

module.exports = router;
