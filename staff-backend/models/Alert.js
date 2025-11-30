const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['CRITICAL_OCCUPANCY', 'BED_AVAILABLE', 'PATIENT_DISCHARGE', 'BED_REQUEST', 'SYSTEM']
  },
  severity: {
    type: String,
    required: true,
    enum: ['info', 'warning', 'critical'],
    default: 'info'
  },
  message: {
    type: String,
    required: true
  },
  ward: {
    type: String
  },
  relatedBed: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bed'
  },
  relatedPatient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Alert', alertSchema);
