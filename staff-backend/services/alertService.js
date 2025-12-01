const Alert = require('../models/Alert');

/**
 * Check occupancy threshold and bed availability
 * @param {ObjectId} wardId - Ward ID to check
 * @param {Object} io - Socket.IO instance
 */
const checkOccupancyThreshold = async (wardId, io) => {
  try {
    const Bed = require('../models/Bed');
    const Ward = require('../models/Ward');

    const ward = await Ward.findById(wardId);
    if (!ward) return;

    // Get bed counts by status
    const totalBeds = await Bed.countDocuments({ ward: wardId });
    const occupiedBeds = await Bed.countDocuments({ ward: wardId, status: 'occupied' });
    const cleaningBeds = await Bed.countDocuments({ ward: wardId, status: 'cleaning' });
    const maintenanceBeds = await Bed.countDocuments({ ward: wardId, status: 'maintenance' });
    const reservedBeds = await Bed.countDocuments({ ward: wardId, status: 'reserved' });
    const availableBeds = await Bed.countDocuments({ ward: wardId, status: 'available' });

    if (totalBeds === 0) return;

    const occupancyPercentage = (occupiedBeds / totalBeds) * 100;
    const unavailableBeds = cleaningBeds + maintenanceBeds + reservedBeds;
    const unavailablePercentage = (unavailableBeds / totalBeds) * 100;

    console.log(`Ward ${ward.name} - Occupied: ${occupancyPercentage.toFixed(1)}%, Unavailable: ${unavailablePercentage.toFixed(1)}%, Available: ${availableBeds}`);

    // Alert if NO beds available
    if (availableBeds === 0) {
      await createAlert({
        type: 'CRITICAL_OCCUPANCY',
        severity: 'critical',
        message: `🚨 CRITICAL: ${ward.name} has NO available beds! (${occupiedBeds} occupied, ${cleaningBeds} cleaning, ${maintenanceBeds} maintenance, ${reservedBeds} reserved)`,
        ward: wardId,
        threshold: 100,
        io
      });
    }
    // Alert if occupancy >= 90%
    else if (occupancyPercentage >= 90) {
      await createAlert({
        type: 'CRITICAL_OCCUPANCY',
        severity: 'critical',
        message: `⚠️ CRITICAL: ${ward.name} is at ${occupancyPercentage.toFixed(1)}% capacity (${occupiedBeds}/${totalBeds} beds occupied, ${availableBeds} available)`,
        ward: wardId,
        threshold: 90,
        io
      });
    }
    // Alert if occupancy >= 80%
    else if (occupancyPercentage >= 80) {
      await createAlert({
        type: 'CRITICAL_OCCUPANCY',
        severity: 'warning',
        message: `⚠️ WARNING: ${ward.name} is at ${occupancyPercentage.toFixed(1)}% capacity (${occupiedBeds}/${totalBeds} beds occupied, ${availableBeds} available)`,
        ward: wardId,
        threshold: 80,
        io
      });
    }

    // Alert if many beds unavailable due to cleaning/maintenance
    if (unavailablePercentage >= 30 && availableBeds < 3) {
      await createAlert({
        type: 'BED_UNAVAILABLE',
        severity: 'warning',
        message: `⚠️ ${ward.name}: ${unavailableBeds} beds unavailable (${cleaningBeds} cleaning, ${maintenanceBeds} maintenance, ${reservedBeds} reserved). Only ${availableBeds} beds available.`,
        ward: wardId,
        io
      });
    }

    return { 
      occupancyPercentage, 
      occupiedBeds, 
      totalBeds,
      availableBeds,
      cleaningBeds,
      maintenanceBeds,
      reservedBeds
    };
  } catch (error) {
    console.error('Error checking occupancy threshold:', error);
  }
};

/**
 * Create and emit alert
 * @param {Object} alertData - Alert data
 */
const createAlert = async ({ type, severity, message, ward, threshold, io }) => {
  try {
    // Check if similar alert exists in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const existingAlert = await Alert.findOne({
      type,
      ward,
      threshold,
      createdAt: { $gte: oneHourAgo },
      isRead: false
    });

    // Don't create duplicate alerts
    if (existingAlert) {
      console.log('Similar alert already exists, skipping');
      return existingAlert;
    }

    // Create new alert
    const alert = await Alert.create({
      type,
      severity,
      message,
      ward,
      threshold
    });

    console.log(`Alert created: ${message}`);

    // Emit to all connected clients
    if (io) {
      io.emit('alert:new', {
        _id: alert._id,
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        ward: alert.ward,
        createdAt: alert.createdAt
      });
    }

    return alert;
  } catch (error) {
    console.error('Error creating alert:', error);
  }
};

/**
 * Create alert when bed becomes available
 * @param {Object} bed - Bed object
 * @param {Object} io - Socket.IO instance
 */
const createBedAvailableAlert = async (bed, io) => {
  try {
    const Ward = require('../models/Ward');
    const ward = await Ward.findById(bed.ward);

    await createAlert({
      type: 'BED_AVAILABLE',
      severity: 'info',
      message: `✅ Bed ${bed.bedNumber} in ${ward?.name || 'Unknown Ward'} is now available`,
      ward: bed.ward,
      io
    });
  } catch (error) {
    console.error('Error creating bed available alert:', error);
  }
};

/**
 * Create alert for upcoming discharge
 * @param {Object} patient - Patient object
 * @param {Object} io - Socket.IO instance
 */
const createUpcomingDischargeAlert = async (patient, io) => {
  try {
    if (!patient.expectedDischargeDate) return;

    const now = new Date();
    const dischargeDate = new Date(patient.expectedDischargeDate);
    const hoursUntilDischarge = (dischargeDate - now) / (1000 * 60 * 60);

    // Alert if discharge is within 24 hours
    if (hoursUntilDischarge > 0 && hoursUntilDischarge <= 24) {
      const Bed = require('../models/Bed');
      const bed = await Bed.findById(patient.assignedBed).populate('ward');

      await createAlert({
        type: 'discharge_upcoming',
        severity: 'info',
        message: `📅 Patient ${patient.name} (${patient.patientId}) scheduled for discharge in ${Math.round(hoursUntilDischarge)} hours from ${bed?.ward?.name || 'Unknown Ward'}`,
        ward: bed?.ward?._id,
        io
      });
    }
  } catch (error) {
    console.error('Error creating upcoming discharge alert:', error);
  }
};

module.exports = {
  checkOccupancyThreshold,
  createAlert,
  createBedAvailableAlert,
  createUpcomingDischargeAlert
};
