const express = require('express');
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleAuth');
const { predictAvailability, generateSummaryReport, getUpcomingEvents } = require('../services/forecastingService');
const Ward = require('../models/Ward');

const router = express.Router();

// @route   GET /api/forecasting/summary
// @desc    Get summary report for all wards
// @access  Private - HOSPITAL_ADMIN, ICU_MANAGER only
router.get('/summary', protect, checkRole(['HOSPITAL_ADMIN', 'ICU_MANAGER']), async (req, res) => {
  try {
    const report = await generateSummaryReport();

    res.status(200).json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Generate summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating summary report'
    });
  }
});

// @route   GET /api/forecasting/events
// @desc    Get upcoming discharges and surgeries (default 12 hours)
// @access  Private - HOSPITAL_ADMIN only
router.get('/events', protect, checkRole(['HOSPITAL_ADMIN']), async (req, res) => {
  try {
    const { hours } = req.query;
    const hoursAhead = parseInt(hours) || 12;

    const events = await getUpcomingEvents(hoursAhead);

    res.status(200).json({
      success: true,
      events
    });
  } catch (error) {
    console.error('Get upcoming events error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching upcoming events'
    });
  }
});

// @route   GET /api/forecasting/ward/:wardId
// @desc    Get forecast for specific ward
// @access  Private - HOSPITAL_ADMIN, ICU_MANAGER only
router.get('/ward/:wardId', protect, checkRole(['HOSPITAL_ADMIN', 'ICU_MANAGER']), async (req, res) => {
  try {
    const { hours } = req.query;
    const hoursAhead = parseInt(hours) || 24;

    const forecast = await predictAvailability(req.params.wardId, hoursAhead);

    const ward = await Ward.findById(req.params.wardId);

    res.status(200).json({
      success: true,
      ward: {
        id: ward._id,
        name: ward.name,
        type: ward.type
      },
      forecast
    });
  } catch (error) {
    console.error('Generate forecast error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating forecast'
    });
  }
});

module.exports = router;
