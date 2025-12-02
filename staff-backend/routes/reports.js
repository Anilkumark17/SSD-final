const express = require('express');
const Bed = require('../models/Bed');
const Patient = require('../models/Patient');
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleAuth');

const router = express.Router();

// @route   GET /api/reports/utilization
// @desc    Get bed utilization report for hospital administration
// @access  Private - HOSPITAL_ADMIN only
router.get('/utilization', protect, checkRole(['HOSPITAL_ADMIN']), async (req, res) => {
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
// @access  Private - HOSPITAL_ADMIN, ICU_MANAGER
router.get('/summary', protect, checkRole(['HOSPITAL_ADMIN', 'ICU_MANAGER']), async (req, res) => {
  try {
    const Ward = require('../models/Ward');
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // Get ICU ward
    const icuWard = await Ward.findOne({ name: 'ICU' });
    
    if (!icuWard) {
      return res.status(404).json({
        success: false,
        message: 'ICU ward not found'
      });
    }

    // Get ICU stats using Ward ObjectId
    const icuTotal = await Bed.countDocuments({ ward: icuWard._id });
    const icuOccupied = await Bed.countDocuments({ ward: icuWard._id, status: 'occupied' });
    const icuCleaning = await Bed.countDocuments({ ward: icuWard._id, status: 'cleaning' });
    const icuAvailable = await Bed.countDocuments({ ward: icuWard._id, status: 'available' });
    const icuPercentage = icuTotal > 0 ? Math.round((icuOccupied / icuTotal) * 100) : 0;

    // Get next expected discharge
    const nextDischarge = await Patient.findOne({
      status: 'admitted',
      expectedDischargeDate: { $exists: true, $gte: now }
    })
      .sort({ expectedDischargeDate: 1 })
      .populate({
        path: 'assignedBed',
        populate: { path: 'ward' }
      });

    let nextDischargeTime = 'No discharges expected';
    if (nextDischarge && nextDischarge.expectedDischargeDate) {
      nextDischargeTime = new Date(nextDischarge.expectedDischargeDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
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
          ward: nextDischarge.assignedBed?.ward?.name,
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
