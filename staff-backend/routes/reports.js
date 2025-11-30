const express = require('express');
const Bed = require('../models/Bed');
const Patient = require('../models/Patient');
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleAuth');

const router = express.Router();

// @route   GET /api/reports/utilization
// @desc    Get bed utilization report for hospital administration
// @access  Private - Hospital Admin, ICU Manager
router.get('/utilization', protect, checkRole(['HOSPITAL_ADMIN', 'ICU_MANAGER', 'Medical Staff']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Get all wards
    const wards = await Bed.distinct('ward');
    const utilizationData = [];

    for (const ward of wards) {
      const totalBeds = await Bed.countDocuments({ ward });
      const currentOccupied = await Bed.countDocuments({ ward, status: 'occupied' });
      
      // Get historical admission data
      const admissions = await Patient.countDocuments({
        assignedBed: { $exists: true },
        admittedAt: { $gte: start, $lte: end }
      });

      const discharges = await Patient.countDocuments({
        status: 'discharged',
        dischargedAt: { $gte: start, $lte: end }
      });

      const avgOccupancy = totalBeds > 0 ? Math.round((currentOccupied / totalBeds) * 100) : 0;

      utilizationData.push({
        ward,
        totalBeds,
        currentOccupied,
        currentAvailable: totalBeds - currentOccupied,
        avgOccupancyPercentage: avgOccupancy,
        totalAdmissions: admissions,
        totalDischarges: discharges,
        turnoverRate: totalBeds > 0 ? ((admissions + discharges) / (2 * totalBeds)).toFixed(2) : 0
      });
    }

    // Overall summary
    const totalBedsAll = await Bed.countDocuments();
    const totalOccupiedAll = await Bed.countDocuments({ status: 'occupied' });
    const overallUtilization = totalBedsAll > 0 ? Math.round((totalOccupiedAll / totalBedsAll) * 100) : 0;

    res.status(200).json({
      success: true,
      period: { start, end },
      overall: {
        totalBeds: totalBedsAll,
        occupied: totalOccupiedAll,
        utilizationPercentage: overallUtilization
      },
      wardBreakdown: utilizationData
    });
  } catch (error) {
    console.error('Utilization report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating utilization report'
    });
  }
});

// @route   GET /api/reports/summary
// @desc    Get plain-English summary report
// @access  Private
router.get('/summary', protect, async (req, res) => {
  try {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // Get ICU stats
    const icuTotal = await Bed.countDocuments({ ward: 'ICU' });
    const icuOccupied = await Bed.countDocuments({ ward: 'ICU', status: 'occupied' });
    const icuCleaning = await Bed.countDocuments({ ward: 'ICU', status: 'cleaning' });
    const icuAvailable = await Bed.countDocuments({ ward: 'ICU', status: 'available' });
    const icuPercentage = icuTotal > 0 ? Math.round((icuOccupied / icuTotal) * 100) : 0;

    // Get next expected discharge
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const nextDischarge = await Patient.findOne({
      status: 'admitted',
      admittedAt: { $lt: twentyFourHoursAgo }
    })
      .sort({ admittedAt: 1 })
      .populate('assignedBed', 'ward');

    let nextDischargeTime = 'No discharges expected in next 12 hours';
    if (nextDischarge) {
      const estimatedDischarge = new Date(nextDischarge.admittedAt.getTime() + 48 * 60 * 60 * 1000);
      nextDischargeTime = estimatedDischarge.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    const summary = `As of ${timeString}, ICU occupancy is ${icuPercentage}% (${icuOccupied} of ${icuTotal} beds in use). ${icuCleaning} beds under cleaning, ${icuAvailable} available. Next expected discharge at ${nextDischargeTime}.`;

    res.status(200).json({
      success: true,
      summary,
      details: {
        timestamp: now,
        icu: {
          total: icuTotal,
          occupied: icuOccupied,
          cleaning: icuCleaning,
          available: icuAvailable,
          occupancyPercentage: icuPercentage
        },
        nextExpectedDischarge: nextDischarge ? {
          patientName: nextDischarge.name,
          ward: nextDischarge.assignedBed?.ward,
          estimatedTime: nextDischargeTime
        } : null
      }
    });
  } catch (error) {
    console.error('Summary report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating summary'
    });
  }
});

module.exports = router;
