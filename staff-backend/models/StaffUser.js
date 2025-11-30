const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Schema must match the IT Admin 'User' model
const staffUserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false
  },
  // Changed from roles: [String] to role: String to match IT Admin backend
  roles: {
    type: [String],
    enum: ['IT_ADMIN', 'HOSPITAL_ADMIN', 'ICU_MANAGER', 'ER_STAFF', 'WARD_STAFF', 'Medical Staff', 'Nurse', 'Doctor', 'Receptionist'],
    default: ['Medical Staff']
  },
  department: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
staffUserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password
staffUserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Explicitly use 'users' collection to share data with IT Admin backend
module.exports = mongoose.model('StaffUser', staffUserSchema, 'users');
