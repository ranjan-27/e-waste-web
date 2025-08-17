const express = require('express');
const jwt = require('jsonwebtoken');
const Campaign = require('../models/Campaign');
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

// Create new campaign (admin only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const {
      title,
      description,
      type,
      startDate,
      endDate,
      targetAudience,
      maxParticipants,
      rewards
    } = req.body;

    const campaign = new Campaign({
      title,
      description,
      type,
      startDate,
      endDate,
      targetAudience,
      maxParticipants,
      rewards,
      createdBy: req.user.userId
    });

    await campaign.save();
    res.status(201).json(campaign);
  } catch (error) {
    res.status(500).json({ message: 'Error creating campaign', error: error.message });
  }
});

// Get all campaigns
router.get('/', async (req, res) => {
  try {
    const { type, status } = req.query;
    const filter = {};

    if (type) filter.type = type;
    if (status) filter.status = status;

    const campaigns = await Campaign.find(filter)
      .populate('createdBy', 'username')
      .populate('participants.user', 'username department greenScore')
      .sort({ startDate: 1 });

    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching campaigns', error: error.message });
  }
});

// Get campaign by ID
router.get('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('createdBy', 'username')
      .populate('participants.user', 'username department greenScore');

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json(campaign);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching campaign', error: error.message });
  }
});

// Join campaign
router.post('/:id/join', authenticateToken, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Check if campaign is active
    if (campaign.status !== 'active') {
      return res.status(400).json({ message: 'Campaign is not active' });
    }

    // Check if user is already participating
    const isParticipating = campaign.participants.some(
      p => p.user.toString() === req.user.userId
    );

    if (isParticipating) {
      return res.status(400).json({ message: 'Already participating in this campaign' });
    }

    // Check if campaign is full
    if (campaign.maxParticipants && campaign.currentParticipants >= campaign.maxParticipants) {
      return res.status(400).json({ message: 'Campaign is full' });
    }

    // Add user to participants
    campaign.participants.push({
      user: req.user.userId,
      joinedAt: new Date()
    });

    campaign.currentParticipants = campaign.participants.length;
    await campaign.save();

    res.json({ message: 'Successfully joined campaign', campaign });
  } catch (error) {
    res.status(500).json({ message: 'Error joining campaign', error: error.message });
  }
});

// Leave campaign
router.post('/:id/leave', authenticateToken, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Remove user from participants
    campaign.participants = campaign.participants.filter(
      p => p.user.toString() !== req.user.userId
    );

    campaign.currentParticipants = campaign.participants.length;
    await campaign.save();

    res.json({ message: 'Successfully left campaign', campaign });
  } catch (error) {
    res.status(500).json({ message: 'Error leaving campaign', error: error.message });
  }
});

// Update campaign status (admin only)
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { status } = req.body;
    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate('createdBy', 'username')
     .populate('participants.user', 'username department greenScore');

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json(campaign);
  } catch (error) {
    res.status(500).json({ message: 'Error updating campaign status', error: error.message });
  }
});

// Award campaign participants (admin only)
router.post('/:id/award', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const campaign = await Campaign.findById(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    if (campaign.status !== 'completed') {
      return res.status(400).json({ message: 'Campaign must be completed to award participants' });
    }

    // Award green score points to participants
    for (const participant of campaign.participants) {
      await User.findByIdAndUpdate(participant.user, {
        $inc: { greenScore: campaign.rewards.greenScorePoints }
      });
    }

    res.json({ message: 'Participants awarded successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error awarding participants', error: error.message });
  }
});

// Get campaign statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const stats = await Campaign.aggregate([
      {
        $group: {
          _id: null,
          totalCampaigns: { $sum: 1 },
          activeCampaigns: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          completedCampaigns: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          totalParticipants: { $sum: '$currentParticipants' }
        }
      }
    ]);

    const typeStats = await Campaign.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          participants: { $sum: '$currentParticipants' }
        }
      }
    ]);

    const upcomingCampaigns = await Campaign.find({
      status: 'upcoming',
      startDate: { $gte: new Date() }
    }).sort({ startDate: 1 }).limit(5);

    res.json({
      overview: stats[0] || {},
      typeStats,
      upcomingCampaigns
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching campaign statistics', error: error.message });
  }
});

module.exports = router;
