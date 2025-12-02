const Patient = require('../models/Patient');
const Bed = require('../models/Bed');
const Ward = require('../models/Ward');

/**
 * Predict bed availability for a ward
 * @param {ObjectId} wardId - Ward ID
 * @param {Number} hoursAhead - Hours to forecast ahead
 */
const predictAvailability = async (wardId, hoursAhead = 24) => {
  try {
    const now = new Date();
    const forecastEnd = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

    // Current status
    const totalBeds = await Bed.countDocuments({ ward: wardId });
    const currentAvailable = await Bed.countDocuments({ ward: wardId, status: 'available' });
    const currentOccupied = await Bed.countDocuments({ ward: wardId, status: 'occupied' });
    const currentCleaning = await Bed.countDocuments({ ward: wardId, status: 'cleaning' });

    // Expected discharges within forecast period
    const upcomingDischarges = await Patient.find({
      assignedBed: { $exists: true },
      status: 'admitted',
      expectedDischargeDate: {
        $gte: now,
        $lte: forecastEnd
      }
    }).populate({
      path: 'assignedBed',
      match: { ward: wardId }
    });

    const validDischarges = upcomingDischarges.filter(p => p.assignedBed);

    // Beds currently cleaning (will be available after ~1 hour)
    const cleaningBeds = await Bed.find({
      ward: wardId,
      status: 'cleaning',
      estimatedAvailableTime: { $lte: forecastEnd }
    });

    // Calculate predicted availability
    const bedsFromDischarges = validDischarges.length;
    const bedsFromCleaning = cleaningBeds.length;
    const predictedAvailable = currentAvailable + bedsFromDischarges + bedsFromCleaning;

    return {
      current: {
        total: totalBeds,
        available: currentAvailable,
        occupied: currentOccupied,
        cleaning: currentCleaning,
        occupancyRate: totalBeds > 0 ? ((currentOccupied / totalBeds) * 100).toFixed(1) : 0
      },
      forecast: {
        hoursAhead,
        expectedDischarges: bedsFromDischarges,
        cleaningComplete: bedsFromCleaning,
        predictedAvailable,
        predictedOccupied: currentOccupied - bedsFromDischarges,
        predictedOccupancyRate: totalBeds > 0 ? (((currentOccupied - bedsFromDischarges) / totalBeds) * 100).toFixed(1) : 0
      },
      upcomingDischarges: validDischarges.map(p => ({
        patientId: p.patientId,
        patientName: p.name,
        bedNumber: p.assignedBed?.bedNumber,
        expectedDischarge: p.expectedDischargeDate
      }))
    };
  } catch (error) {
    console.error('Error predicting availability:', error);
    throw error;
  }
};

/**
 * Generate summary report for all wards
 */
const generateSummaryReport = async () => {
  try {
    const wards = await Ward.find();
    const now = new Date();

    const reports = await Promise.all(wards.map(async (ward) => {
      const forecast = await predictAvailability(ward._id, 24);

      // Find next expected discharge
      const nextDischarge = await Patient.findOne({
        assignedBed: { $exists: true },
        status: 'admitted',
        expectedDischargeDate: { $gte: now }
      })
        .populate({
          path: 'assignedBed',
          match: { ward: ward._id }
        })
        .sort({ expectedDischargeDate: 1 });

      const validNextDischarge = nextDischarge?.assignedBed ? nextDischarge : null;

      return {
        ward: {
          id: ward._id,
          name: ward.name,
          type: ward.type
        },
        ...forecast,
        nextExpectedDischarge: validNextDischarge ? {
          time: validNextDischarge.expectedDischargeDate,
          patientId: validNextDischarge.patientId,
          bedNumber: validNextDischarge.assignedBed?.bedNumber
        } : null
      };
    }));

    // Generate plain English summary
    const summaries = reports.map(r => {
      const { ward, current, forecast, nextExpectedDischarge } = r;
      let summary = `${ward.name}: ${current.occupancyRate}% occupancy (${current.occupied} of ${current.total} beds in use).`;

      if (current.cleaning > 0) {
        summary += ` ${current.cleaning} bed${current.cleaning > 1 ? 's' : ''} under cleaning.`;
      }

      if (current.available > 0) {
        summary += ` ${current.available} available.`;
      }

      if (nextExpectedDischarge) {
        const dischargeTime = new Date(nextExpectedDischarge.time);
        summary += ` Next expected discharge at ${dischargeTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}.`;
      }

      return summary;
    });

    return {
      timestamp: now,
      reports,
      summary: summaries.join(' ')
    };
  } catch (error) {
    console.error('Error generating summary report:', error);
    throw error;
  }
};



/**
 * Get upcoming discharges and surgeries for the next X hours
 * @param {Number} hoursAhead - Hours to forecast ahead
 */
const getUpcomingEvents = async (hoursAhead = 12) => {
  try {
    const now = new Date();
    const forecastEnd = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

    // 1. Upcoming Discharges
    const upcomingDischarges = await Patient.find({
      assignedBed: { $exists: true },
      status: 'admitted',
      expectedDischargeDate: {
        $gte: now,
        $lte: forecastEnd
      }
    }).populate({
      path: 'assignedBed',
      populate: { path: 'ward' }
    });

    const discharges = upcomingDischarges.map(p => ({
      patientId: p.patientId,
      patientName: p.name,
      ward: p.assignedBed?.ward?.name || 'Unknown',
      bedNumber: p.assignedBed?.bedNumber || 'Unknown',
      expectedDischargeTime: p.expectedDischargeDate
    }));

    // 2. Upcoming Surgeries
    // Find patients with surgeries scheduled
    const patientsWithSurgeries = await Patient.find({
      'surgeries.status': 'scheduled',
      status: 'admitted'
    });

    const surgeries = [];
    patientsWithSurgeries.forEach(p => {
      if (p.surgeries && p.surgeries.length > 0) {
        p.surgeries.forEach(s => {
          if (s.status !== 'scheduled') return;

          // Combine date and time to check if it falls in window
          const surgeryDateTime = new Date(s.date);
          const [hours, minutes] = s.time.split(':');
          surgeryDateTime.setHours(parseInt(hours), parseInt(minutes));

          if (surgeryDateTime >= now && surgeryDateTime <= forecastEnd) {
            surgeries.push({
              patientId: p.patientId,
              patientName: p.name,
              procedure: s.procedureName,
              surgeon: s.surgeon,
              time: surgeryDateTime,
              status: s.status
            });
          }
        });
      }
    });

    // Sort by time
    discharges.sort((a, b) => new Date(a.expectedDischargeTime) - new Date(b.expectedDischargeTime));
    surgeries.sort((a, b) => new Date(a.time) - new Date(b.time));

    return {
      timeWindow: {
        start: now,
        end: forecastEnd,
        hours: hoursAhead
      },
      discharges,
      surgeries
    };

  } catch (error) {
    console.error('Error getting upcoming events:', error);
    throw error;
  }
};

module.exports = {
  predictAvailability,
  generateSummaryReport,
  getUpcomingEvents
};
