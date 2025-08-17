const express = require('express');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const Ewaste = require('../models/Ewaste');
const User = require('../models/User');
const router = express.Router();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Generate unique item ID
const generateItemId = () => {
  return 'EW' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
};

// Create new e-waste item
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      category,
      type,
      description,
      department,
      age,
      weight,
      location
    } = req.body;

    const itemId = generateItemId();
    
    // Generate QR code data
    const qrData = JSON.stringify({
      itemId,
      name,
      category,
      type,
      department,
      reportedBy: req.user.userId
    });

    // Generate QR code
    const qrCode = await QRCode.toDataURL(qrData);

    const ewaste = new Ewaste({
      itemId,
      name,
      category,
      type,
      description,
      department,
      reportedBy: req.user.userId,
      age,
      weight,
      qrCode,
      location
    });

    await ewaste.save();

    // Update user's green score and contribution
    await User.findByIdAndUpdate(req.user.userId, {
      $inc: { 
        greenScore: 10,
        totalContribution: weight
      }
    });

    res.status(201).json({
      message: 'E-waste item reported successfully',
      ewaste,
      qrCode
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating e-waste item', error: error.message });
  }
});

// Get all e-waste items (with filters)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { department, category, status, type } = req.query;
    const filter = {};

    if (department) filter.department = department;
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (type) filter.type = type;

    const ewaste = await Ewaste.find(filter)
      .populate('reportedBy', 'username department')
      .populate('vendor', 'username')
      .sort({ createdAt: -1 });

    res.json(ewaste);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching e-waste items', error: error.message });
  }
});

// Get e-waste item by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const ewaste = await Ewaste.findById(req.params.id)
      .populate('reportedBy', 'username department')
      .populate('vendor', 'username');

    if (!ewaste) {
      return res.status(404).json({ message: 'E-waste item not found' });
    }

    res.json(ewaste);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching e-waste item', error: error.message });
  }
});

// Update e-waste item status
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status, scheduledPickup, vendor } = req.body;
    
    const updateData = { status };
    if (scheduledPickup) updateData.scheduledPickup = scheduledPickup;
    if (vendor) updateData.vendor = vendor;

    const ewaste = await Ewaste.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('reportedBy', 'username department')
     .populate('vendor', 'username');

    if (!ewaste) {
      return res.status(404).json({ message: 'E-waste item not found' });
    }

    res.json(ewaste);
  } catch (error) {
    res.status(500).json({ message: 'Error updating e-waste item', error: error.message });
  }
});

// Get e-waste statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const stats = await Ewaste.aggregate([
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalWeight: { $sum: '$weight' },
          recyclableItems: {
            $sum: { $cond: [{ $eq: ['$type', 'recyclable'] }, 1, 0] }
          },
          reusableItems: {
            $sum: { $cond: [{ $eq: ['$type', 'reusable'] }, 1, 0] }
          },
          hazardousItems: {
            $sum: { $cond: [{ $eq: ['$type', 'hazardous'] }, 1, 0] }
          },
          recycledItems: {
            $sum: { $cond: [{ $eq: ['$status', 'recycled'] }, 1, 0] }
          }
        }
      }
    ]);

    const departmentStats = await Ewaste.aggregate([
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
          weight: { $sum: '$weight' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const categoryStats = await Ewaste.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          weight: { $sum: '$weight' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      overview: stats[0] || {},
      departmentStats,
      categoryStats
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching statistics', error: error.message });
  }
});

// Search e-waste items by QR code
router.get('/search/qr/:itemId', authenticateToken, async (req, res) => {
  try {
    const ewaste = await Ewaste.findOne({ itemId: req.params.itemId })
      .populate('reportedBy', 'username department')
      .populate('vendor', 'username');

    if (!ewaste) {
      return res.status(404).json({ message: 'E-waste item not found' });
    }

    res.json(ewaste);
  } catch (error) {
    res.status(500).json({ message: 'Error searching e-waste item', error: error.message });
  }
});

module.exports = router;
