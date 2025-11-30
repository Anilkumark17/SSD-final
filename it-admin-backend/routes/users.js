const express = require('express');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// @route   GET /api/users
// @desc    Get all employees
// @access  Private
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    
    res.status(200).json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
});

// @route   POST /api/users
// @desc    Create new employee
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { name, email, password, roles, department } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Ensure roles is an array
    const userRoles = Array.isArray(roles) && roles.length > 0 
      ? roles 
      : ['WARD_STAFF'];

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      roles: userRoles,
      department: department || '',
      isActive: true
    });

    // Return user without password
    const userResponse = await User.findById(user._id).select('-password');

    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating user'
    });
  }
});

// @route   PATCH /api/users/:id
// @desc    Update employee details
// @access  Private
router.patch('/:id', async (req, res) => {
  try {
    const { name, email, roles, department, password, isActive } = req.body;

    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (roles && Array.isArray(roles)) user.roles = roles;
    if (department !== undefined) user.department = department;
    if (password) user.password = password; // Will be hashed by pre-save hook
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    const updatedUser = await User.findById(user._id).select('-password');

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating user'
    });
  }
});

// @route   PATCH /api/users/:id/toggle-status
// @desc    Toggle employee active/inactive status
// @access  Private
router.patch('/:id/toggle-status', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    const updatedUser = await User.findById(user._id).select('-password');

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Toggle status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling user status'
    });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete employee
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user'
    });
  }
});

module.exports = router;