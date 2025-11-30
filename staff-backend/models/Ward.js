const mongoose = require('mongoose');

const wardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide ward name'],
    unique: true,
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Please provide ward type'],
    enum: ['ICU', 'ER', 'General Ward'],
    trim: true
  },
  capacity: {
    type: Number,
    required: [true, 'Please provide capacity']
  },
  floor: {
    type: Number,
    required: true
  },
  equipment: {
    type: [String],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Ward', wardSchema);
