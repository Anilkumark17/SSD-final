require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const StaffUser = require('../models/StaffUser');
const Bed = require('../models/Bed');
const Patient = require('../models/Patient');
const Ward = require('../models/Ward');
const EmergencyRequest = require('../models/EmergencyRequest');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

const seedData = async () => {
  await connectDB();

  try {
    // Clear existing data
    await StaffUser.deleteMany({});
    await Bed.deleteMany({});
    await Patient.deleteMany({});
    await EmergencyRequest.deleteMany({});
    await Ward.deleteMany({});
    
    console.log('Cleared existing data');

    // 1. Create Staff Users
    const staffUsers = [
      {
        name: 'Anuradha Manager',
        email: 'anuradha@hospital.com',
        password: 'password123',
        roles: ['ICU_MANAGER'],
        department: 'ICU'
      },
      {
        name: 'John Nurse',
        email: 'nurse@hospital.com',
        password: 'password123',
        roles: ['Nurse'],
        department: 'General Ward'
      },
      {
        name: 'Dr. Smith',
        email: 'doctor@hospital.com',
        password: 'password123',
        roles: ['Doctor'],
        department: 'Cardiology'
      },
      {
        name: 'ER Staff',
        email: 'er@hospital.com',
        password: 'password123',
        roles: ['ER_STAFF'],
        department: 'Emergency'
      }
    ];

    const createdStaff = await StaffUser.create(staffUsers);
    console.log(`Created ${createdStaff.length} staff users`);

    // 2. Create Wards and Beds
    const wardConfigs = [
      { name: 'ICU', type: 'ICU', capacity: 15, floor: 2, equipment: ['Ventilator', 'Monitor', 'Oxygen'] },
      { name: 'ER', type: 'ER', capacity: 20, floor: 1, equipment: ['Monitor', 'Defibrillator', 'Oxygen'] },
      { name: 'General Ward', type: 'General Ward', capacity: 40, floor: 3, equipment: ['Oxygen'] }
    ];

    const createdWards = await Ward.create(wardConfigs);
    console.log(`Created ${createdWards.length} wards`);

    let beds = [];
    for (const ward of createdWards) {
      for (let i = 1; i <= ward.capacity; i++) {
        beds.push({
          bedNumber: `${ward.name.substring(0, 3).toUpperCase()}-${i.toString().padStart(3, '0')}`,
          ward: ward._id,
          floor: ward.floor,
          status: 'available',
          equipmentType: ward.equipment
        });
      }
    }

    // Mark some beds as occupied/cleaning/maintenance
    beds[0].status = 'maintenance';
    beds[1].status = 'cleaning';
    
    const createdBeds = await Bed.create(beds);
    console.log(`Created ${createdBeds.length} beds`);

    // 3. Create Patients and Assign to Beds
    const patients = [
      {
        name: 'Rahul Sharma',
        age: 45,
        gender: 'Male',
        department: 'Cardiology',
        reasonForAdmission: 'Chest Pain',
        priority: 'high',
        status: 'admitted'
      },
      {
        name: 'Priya Patel',
        age: 28,
        gender: 'Female',
        department: 'General',
        reasonForAdmission: 'Dengue Fever',
        priority: 'medium',
        status: 'admitted'
      },
      {
        name: 'Amit Kumar',
        age: 62,
        gender: 'Male',
        department: 'ICU',
        reasonForAdmission: 'Respiratory Failure',
        priority: 'critical',
        status: 'admitted'
      }
    ];

    // Assign patients to beds
    // Patient 1 -> Bed 2 (index 2)
    if (createdBeds.length > 2) {
      const bed1 = createdBeds[2];
      const patient1 = await Patient.create({
        ...patients[0],
        assignedBed: bed1._id
      });
      bed1.status = 'occupied';
      bed1.currentPatient = patient1._id;
      await bed1.save();
    }

    // Patient 2 -> Bed 12 (index 12)
    if (createdBeds.length > 12) {
      const bed2 = createdBeds[12];
      const patient2 = await Patient.create({
        ...patients[1],
        assignedBed: bed2._id
      });
      bed2.status = 'occupied';
      bed2.currentPatient = patient2._id;
      await bed2.save();
    }

    // Patient 3 -> Bed 3 (index 3)
    if (createdBeds.length > 3) {
      const bed3 = createdBeds[3];
      const patient3 = await Patient.create({
        ...patients[2],
        assignedBed: bed3._id
      });
      bed3.status = 'occupied';
      bed3.currentPatient = patient3._id;
      await bed3.save();
    }

    console.log('Created patients and assigned beds');

    // 4. Create Emergency Requests
    await EmergencyRequest.create({
      patientName: 'Suresh Raina',
      urgency: 'critical',
      preferredWard: 'ICU',
      requiredEquipment: ['Ventilator'],
      notes: 'Severe accident case',
      requestedBy: createdStaff[3]._id, // ER Staff
      status: 'pending'
    });

    console.log('Created emergency requests');
    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
