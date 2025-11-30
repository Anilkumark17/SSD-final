const mongoose = require('mongoose');

const bedSchema = new mongoose.Schema({
  bedNumber: {
    type: String,
    required: [true, 'Please provide a bed number'],
    unique: true,
    trim: true
  },
  ward: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ward',
    required: [true, 'Please provide a ward']
  },
  floor: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'cleaning', 'reserved', 'maintenance'],
    default: 'available'
  },
  equipmentType: {
    type: [String],
    default: []
  },
  currentPatient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    default: null
  },
  estimatedAvailableTime: {
    type: Date,
    default: null
  },
  cleaningStartedAt: {
    type: Date,
    default: null
  },
  autoCleaningEnabled: {
    type: Boolean,
    default: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Update lastUpdated and track cleaning start time
bedSchema.pre('save', function(next) {
  this.lastUpdated = Date.now();
  
  // Track when cleaning starts
  if (this.isModified('status') && this.status === 'cleaning') {
    this.cleaningStartedAt = Date.now();
    // Set estimated available time to 1 hour from now
    this.estimatedAvailableTime = new Date(Date.now() + 60 * 60 * 1000);
  }
  
  // Clear cleaning time when status changes from cleaning
  if (this.isModified('status') && this.status !== 'cleaning') {
    this.cleaningStartedAt = null;
  }
  
  next();
});

module.exports = mongoose.model('Bed', bedSchema);
