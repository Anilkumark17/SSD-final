const express = require('express');
const router = express.Router();

// Simulated in-memory storage for nurses
let nurses = [];

/**
 * POST /nurses
 * Create a new nurse profile
 */
router.post('/', (req, res) => {
  try {
    const { name, department, experience, phone, email, shift, bio } = req.body;

    // Validation
    if (!name || !department || experience === undefined || !phone || !email || !shift) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, department, experience, phone, email, shift',
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

    // Validate shift
    const validShifts = ['Morning', 'Evening', 'Night'];
    if (!validShifts.includes(shift)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid shift. Must be Morning, Evening, or Night.',
      });
    }

    // Create nurse object
    const nurse = {
      id: Date.now(),
      name,
      department,
      experience: Number(experience),
      phone,
      email,
      shift,
      bio: bio || '',
      createdAt: new Date(),
    };

    nurses.push(nurse);

    res.status(201).json({
      success: true,
      message: 'Nurse profile created successfully.',
      data: nurse,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating nurse profile.',
      error: error.message,
    });
  }
});

/**
 * GET /nurses
 * Retrieve all nurse profiles
 */
router.get('/', (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: nurses,
      count: nurses.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving nurse profiles.',
      error: error.message,
    });
  }
});

/**
 * GET /nurses/:id
 * Retrieve a specific nurse profile by ID
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const nurse = nurses.find(n => n.id === Number(id));

    if (!nurse) {
      return res.status(404).json({
        success: false,
        message: 'Nurse not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: nurse,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving nurse profile.',
      error: error.message,
    });
  }
});

/**
 * PUT /nurses/:id
 * Update a nurse profile
 */
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, department, experience, phone, email, shift, bio } = req.body;

    const nurseIndex = nurses.findIndex(n => n.id === Number(id));

    if (nurseIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Nurse not found.',
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

    if (shift) {
      const validShifts = ['Morning', 'Evening', 'Night'];
      if (!validShifts.includes(shift)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid shift. Must be Morning, Evening, or Night.',
        });
      }
    }

    // Update nurse
    nurses[nurseIndex] = {
      ...nurses[nurseIndex],
      ...(name && { name }),
      ...(department && { department }),
      ...(experience !== undefined && { experience: Number(experience) }),
      ...(phone && { phone }),
      ...(email && { email }),
      ...(shift && { shift }),
      ...(bio && { bio }),
      updatedAt: new Date(),
    };

    res.status(200).json({
      success: true,
      message: 'Nurse profile updated successfully.',
      data: nurses[nurseIndex],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating nurse profile.',
      error: error.message,
    });
  }
});

/**
 * DELETE /nurses/:id
 * Delete a nurse profile
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const nurseIndex = nurses.findIndex(n => n.id === Number(id));

    if (nurseIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Nurse not found.',
      });
    }

    const deletedNurse = nurses.splice(nurseIndex, 1);

    res.status(200).json({
      success: true,
      message: 'Nurse profile deleted successfully.',
      data: deletedNurse[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting nurse profile.',
      error: error.message,
    });
  }
});

module.exports = router;
