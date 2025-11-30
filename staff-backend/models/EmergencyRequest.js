const mongoose = require('mongoose');

const emergencyRequestSchema = new mongoose.Schema({
  patientName: {
    type: String,
    required: [true, 'Please provide patient name'],
    trim: true
  },
  urgency: {
    type: String,
    enum: ['moderate', 'urgent', 'critical'],
    required: true,
    default: 'urgent'
  },
  preferredWard: {
    type: String,
    required: true,
    trim: true
  },
  requiredEquipment: {
    type: [String],
    default: []
  },
  notes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'cancelled'],
    default: 'pending'
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StaffUser',
    required: true
  },
  recommendedBed: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bed',
    default: null
  },
  assignedBed: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bed',
    default: null
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model('EmergencyRequest', emergencyRequestSchema);
