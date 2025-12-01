const express = require('express');
const { protect } = require('../middleware/auth');
const { predictAvailability, generateSummaryReport } = require('../services/forecastingService');
const Ward = require('../models/Ward');

const router = express.Router();

// @route   GET /api/forecasting/summary
// @desc    Get summary report for all wards
// @access  Private
router.get('/summary', protect, async (req, res) => {
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

// @route   GET /api/forecasting/ward/:wardId
// @desc    Get forecast for specific ward
// @access  Private
router.get('/ward/:wardId', protect, async (req, res) => {
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
