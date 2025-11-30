require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const StaffUser = require('./models/StaffUser');

const testAuth = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    // Find the user
    const user = await StaffUser.findOne({ email: 'anuradha@hospital.com' }).select('+password');
    
    if (!user) {
      console.log('❌ User not found!');
      process.exit(1);
    }

    console.log('✅ User found:', user.email);
    console.log('User roles:', user.roles);
    console.log('Password hash (first 20 chars):', user.password.substring(0, 20) + '...');
    console.log('Password hash length:', user.password.length);
    
    // Test password comparison
    const testPassword = 'password123';
    console.log('\nTesting password:', testPassword);
    
    const isMatch = await user.comparePassword(testPassword);
    console.log('Password match result:', isMatch ? '✅ MATCH' : '❌ NO MATCH');
    
    // Also test with bcrypt directly
    const directMatch = await bcrypt.compare(testPassword, user.password);
    console.log('Direct bcrypt compare:', directMatch ? '✅ MATCH' : '❌ NO MATCH');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

testAuth();
