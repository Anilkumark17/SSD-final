const mongoose = require('mongoose');
const BedRequest = require('./models/BedRequest');
const dotenv = require('dotenv');

dotenv.config();

const checkBedRequests = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        console.log('\n--- ALL BED REQUESTS ---');
        const requests = await BedRequest.find({});
        console.log(`Found ${requests.length} bed requests`);

        requests.forEach(req => {
            console.log(`\nID: ${req._id}`);
            console.log(`Patient: ${req.patientId}`);
            console.log(`Status: ${req.status}`);
            console.log(`Ward: ${req.wardType}`);
            console.log(`Date: ${req.requestDate}`);
        });

        if (requests.length === 0) {
            console.log('\n⚠️  No bed requests found in database!');
            console.log('You need to create a bed request first from the ICU Manager dashboard.');
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkBedRequests();
