const express = require('express');
const jwt = require('jsonwebtoken');
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

// Get all users (for admin)
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const users = await User.find().select('-password').sort({ greenScore: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

// Get user leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const leaderboard = await User.find()
      .select('username department greenScore totalContribution')
      .sort({ greenScore: -1 })
      .limit(20);

    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching leaderboard', error: error.message });
  }
});

// Get department leaderboard
router.get('/leaderboard/department/:department', async (req, res) => {
  try {
    const leaderboard = await User.find({ department: req.params.department })
      .select('username greenScore totalContribution')
      .sort({ greenScore: -1 })
      .limit(10);

    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching department leaderboard', error: error.message });
  }
});

// Update user green score (admin only)
router.patch('/:id/green-score', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { greenScore } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { greenScore },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating green score', error: error.message });
  }
});

// Get user statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          totalGreenScore: { $sum: '$greenScore' },
          totalContribution: { $sum: '$totalContribution' },
          avgGreenScore: { $avg: '$greenScore' }
        }
      }
    ]);

    const departmentStats = await User.aggregate([
      {
        $group: {
          _id: '$department',
          userCount: { $sum: 1 },
          avgGreenScore: { $avg: '$greenScore' },
          totalContribution: { $sum: '$totalContribution' }
        }
      },
      { $sort: { avgGreenScore: -1 } }
    ]);

    res.json({
      overview: stats[0] || {},
      departmentStats
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user statistics', error: error.message });
  }
});

module.exports = router;
