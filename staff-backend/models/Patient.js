const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  patientId: {
    type: String,
    unique: true
  },
  name: {
    type: String,
    required: [true, 'Please provide patient name'],
    trim: true
  },
  age: {
    type: Number,
    required: [true, 'Please provide patient age'],
    min: 0
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: true
  },
  department: {
    type: String,
    required: [true, 'Please provide department'],
    trim: true
  },
  reasonForAdmission: {
    type: String,
    required: [true, 'Please provide reason for admission'],
    trim: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['admitted', 'discharged', 'transferred'],
    default: 'admitted'
  },
  assignedBed: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bed',
    default: null
  },
  admittedAt: {
    type: Date,
    default: Date.now
  },
  dischargedAt: {
    type: Date,
    default: null
  },
  estimatedStayDays: {
    type: Number,
    min: 0,
    default: null
  },
  expectedDischargeDate: {
    type: Date,
    default: null
  }
});

// Auto-generate 5-char unique patient ID before saving
patientSchema.pre('save', async function(next) {
  // Generate patient ID for new patients
  if (this.isNew && !this.patientId) {
    let unique = false;
    let newId = '';
    
    // Try up to 5 times to generate a unique ID
    let attempts = 0;
    while (!unique && attempts < 5) {
      // Generate 5 char alphanumeric ID (e.g., 9X2A1)
      newId = Math.random().toString(36).substring(2, 7).toUpperCase();
      
      // Check if exists
      const existing = await this.constructor.findOne({ patientId: newId });
      if (!existing) {
        unique = true;
      }
      attempts++;
    }

    if (!unique) {
      // Fallback if collision persists (unlikely)
      newId = Date.now().toString().slice(-5);
    }
    
    this.patientId = newId;
  }

  // Calculate expected discharge date if estimated stay is provided
  if (this.estimatedStayDays && this.estimatedStayDays > 0) {
    const admissionDate = this.admittedAt || new Date();
    const dischargeDate = new Date(admissionDate);
    dischargeDate.setDate(dischargeDate.getDate() + this.estimatedStayDays);
    this.expectedDischargeDate = dischargeDate;
  }
  
  next();
});

module.exports = mongoose.model('Patient', patientSchema);
