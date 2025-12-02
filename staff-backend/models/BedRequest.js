const mongoose = require('mongoose');

const bedRequestSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StaffUser',
    required: true
  },
  wardType: {
    type: String,
    required: true,
    enum: ['ICU', 'General Ward A', 'General Ward B', 'ER', 'Cardiology', 'Surgery']
  },
  equipmentRequired: {
    type: String,
    enum: ['standard', 'ventilator', 'cardiac_monitor', 'dialysis'],
    default: 'standard'
  },
  priority: {
    type: String,
    enum: ['routine', 'urgent', 'critical'],
    default: 'routine'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'assigned', 'fulfilled', 'cancelled'],
    default: 'pending'
  },
  notes: {
    type: String
  },
  recommendedBeds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bed'
  }],
  assignedBedId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bed'
  },
  requestDate: {
    type: Date,
    default: Date.now
  },
  fulfilledDate: {
    type: Date
  }
});

module.exports = mongoose.model('BedRequest', bedRequestSchema);
