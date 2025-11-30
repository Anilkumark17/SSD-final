const express = require('express');
const Bed = require('../models/Bed');
const Patient = require('../models/Patient');
const EmergencyRequest = require('../models/EmergencyRequest');
const Alert = require('../models/Alert');
const BedRequest = require('../models/BedRequest');
const Ward = require('../models/Ward');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/dashboard/overview
// @desc    Get dashboard statistics matching friend's code structure
// @access  Private
router.get('/overview', protect, async (req, res) => {
  try {
    // Get ward stats
    const wards = await Ward.find({});
    const wardStats = [];

    for (const ward of wards) {
      const totalBeds = await Bed.countDocuments({ ward: ward._id });
      const occupied = await Bed.countDocuments({ ward: ward._id, status: 'occupied' });
      const available = await Bed.countDocuments({ ward: ward._id, status: 'available' });
      const cleaning = await Bed.countDocuments({ ward: ward._id, status: 'cleaning' });
      const reserved = await Bed.countDocuments({ ward: ward._id, status: 'reserved' });
      
      const occupancyRate = totalBeds > 0 ? ((occupied / totalBeds) * 100).toFixed(1) : '0.0';

      wardStats.push({
        ward: { _id: ward._id, name: ward.name, type: ward.type },
        totalBeds,
        occupied,
        available,
        cleaning,
        reserved,
        occupancyRate
      });
    }

    // Get total patients
    const totalPatients = await Patient.countDocuments({ status: 'admitted' });

    // Get pending requests
    const pendingRequests = await BedRequest.countDocuments({ status: 'pending' });

    // Get unread alerts
    const unreadAlerts = await Alert.countDocuments({ isRead: false });

    // Get upcoming discharges (next 24 hours)
    const twentyFourHoursFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const upcomingDischarges = await Patient.find({
      status: 'admitted',
      assignedBed: { $exists: true }
    })
      .populate('assignedBed', 'bedNumber ward')
      .limit(10)
      .select('name patientId assignedBed admittedAt');

    res.status(200).json({
      wardStats,
      totalPatients,
      pendingRequests,
      unreadAlerts,
      upcomingDischarges
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard overview'
    });
  }
});

// @route   GET /api/dashboard/summary
// @desc    Get plain-English ward summaries
// @access  Private
router.get('/summary', protect, async (req, res) => {
  try {
    const wards = await Ward.find({});
    const summaries = [];

    for (const ward of wards) {
      const total = await Bed.countDocuments({ ward: ward._id });
      const occupied = await Bed.countDocuments({ ward: ward._id, status: 'occupied' });
      const available = await Bed.countDocuments({ ward: ward._id, status: 'available' });
      const cleaning = await Bed.countDocuments({ ward: ward._id, status: 'cleaning' });
      
      const occupancyPercentage = total > 0 ? Math.round((occupied / total) * 100) : 0;
      
      let summary = `As of ${new Date().toLocaleTimeString()}, ${ward.name} occupancy is ${occupancyPercentage}%. `;
      summary += `${occupied} beds occupied, ${available} available`;
      if (cleaning > 0) summary += `, ${cleaning} being cleaned`;
      summary += `.`;

      summaries.push({
        wardId: ward._id,
        wardName: ward.name,
        summary
      });
    }

    res.status(200).json({
      summaries,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating summary'
    });
  }
});

module.exports = router;
