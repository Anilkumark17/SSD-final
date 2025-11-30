const express = require('express');
const jwt = require('jsonwebtoken');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/auth/login
// @desc    Login IT Admin with fixed credentials
// @access  Public
router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body;

    console.log('Login attempt:', { email, passwordProvided: !!password });
    console.log('Expected:', { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    email = email.trim();

    // Check against fixed admin credentials
    // Note: In production, use timing-safe comparison
    if (email !== process.env.ADMIN_EMAIL || password !== process.env.ADMIN_PASSWORD) {
      console.log('Credentials mismatch');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        id: 'admin',
        email: process.env.ADMIN_EMAIL,
        name: process.env.ADMIN_NAME,
        role: 'IT Admin'
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({
      success: true,
      user: {
        id: 'admin',
        name: process.env.ADMIN_NAME,
        email: process.env.ADMIN_EMAIL,
        role: 'IT Admin'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user and clear cookie
// @access  Private
router.post('/logout', protect, (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0)
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

// @route   GET /api/auth/me
// @desc    Get current logged in admin
// @access  Private
router.get('/me', protect, (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user
  });
});

module.exports = router;
