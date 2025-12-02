const mongoose = require('mongoose');
const Ward = require('./models/Ward');
const Bed = require('./models/Bed');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        console.log('\n--- WARDS ---');
        const wards = await Ward.find({});
        console.log(wards.map(w => ({ id: w._id, name: w.name, type: w.type })));

        console.log('\n--- BEDS (Sample) ---');
        const beds = await Bed.find({}).limit(10).populate('ward');
        console.log(beds.map(b => ({
            id: b._id,
            number: b.bedNumber,
            status: b.status,
            wardName: b.ward?.name,
            wardType: b.ward?.type
        })));

        console.log('\n--- CHECKING EMERGENCY BEDS ---');
        // Simulate the query logic
        const targetWards = await Ward.find({
            $or: [{ name: 'Emergency' }, { name: 'ER' }, { name: 'ICU' }, { type: 'ICU' }, { type: 'ER' }]
        });
        const targetWardIds = targetWards.map(w => w._id);
        console.log('Target Ward IDs:', targetWardIds);

        const availableBeds = await Bed.find({
            ward: { $in: targetWardIds },
            status: 'available'
        }).populate('ward');

        console.log(`Found ${availableBeds.length} available beds in target wards.`);
        availableBeds.forEach(b => console.log(`- ${b.bedNumber} (${b.ward.name})`));

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

connectDB();
