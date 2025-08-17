const mongoose = require('mongoose');

const ewasteSchema = new mongoose.Schema({
  itemId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['computers', 'mobile_devices', 'lab_equipment', 'batteries', 'accessories', 'other']
  },
  type: {
    type: String,
    required: true,
    enum: ['recyclable', 'reusable', 'hazardous']
  },
  description: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['reported', 'assessed', 'scheduled', 'collected', 'recycled', 'disposed'],
    default: 'reported'
  },
  age: {
    type: Number, // in years
    required: true
  },
  weight: {
    type: Number, // in kg
    required: true
  },
  qrCode: {
    type: String,
    required: true
  },
  location: {
    building: String,
    floor: String,
    room: String
  },
  scheduledPickup: {
    type: Date
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  environmentalImpact: {
    co2Saved: Number, // in kg
    landfillWasteReduced: Number // in kg
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

ewasteSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Ewaste', ewasteSchema);
