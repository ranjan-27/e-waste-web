const express = require('express');
const jwt = require('jsonwebtoken');
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

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};

// Generate compliance report
router.get('/compliance', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const ewasteData = await Ewaste.find(dateFilter);
    
    const complianceReport = {
      period: { startDate, endDate },
      totalItems: ewasteData.length,
      totalWeight: ewasteData.reduce((sum, item) => sum + item.weight, 0),
      categoryBreakdown: {},
      departmentBreakdown: {},
      statusBreakdown: {},
      environmentalImpact: {
        co2Saved: ewasteData.reduce((sum, item) => sum + (item.environmentalImpact?.co2Saved || 0), 0),
        landfillWasteReduced: ewasteData.reduce((sum, item) => sum + (item.environmentalImpact?.landfillWasteReduced || 0), 0)
      },
      complianceScore: 0
    };

    // Calculate breakdowns
    ewasteData.forEach(item => {
      // Category breakdown
      if (!complianceReport.categoryBreakdown[item.category]) {
        complianceReport.categoryBreakdown[item.category] = { count: 0, weight: 0 };
      }
      complianceReport.categoryBreakdown[item.category].count++;
      complianceReport.categoryBreakdown[item.category].weight += item.weight;

      // Department breakdown
      if (!complianceReport.departmentBreakdown[item.department]) {
        complianceReport.departmentBreakdown[item.department] = { count: 0, weight: 0 };
      }
      complianceReport.departmentBreakdown[item.department].count++;
      complianceReport.departmentBreakdown[item.department].weight += item.weight;

      // Status breakdown
      if (!complianceReport.statusBreakdown[item.status]) {
        complianceReport.statusBreakdown[item.status] = { count: 0, weight: 0 };
      }
      complianceReport.statusBreakdown[item.status].count++;
      complianceReport.statusBreakdown[item.status].weight += item.weight;
    });

    // Calculate compliance score
    const recycledItems = ewasteData.filter(item => item.status === 'recycled').length;
    complianceReport.complianceScore = Math.round((recycledItems / ewasteData.length) * 100);

    res.json(complianceReport);
  } catch (error) {
    res.status(500).json({ message: 'Error generating compliance report', error: error.message });
  }
});

// Generate inventory audit report
router.get('/inventory-audit', authenticateToken, async (req, res) => {
  try {
    const ewasteData = await Ewaste.find().populate('reportedBy', 'username department');
    
    const auditReport = {
      totalItems: ewasteData.length,
      itemsByAge: {
        '0-2 years': 0,
        '3-5 years': 0,
        '6-8 years': 0,
        '9+ years': 0
      },
      itemsByType: {
        recyclable: 0,
        reusable: 0,
        hazardous: 0
      },
      itemsByStatus: {
        reported: 0,
        assessed: 0,
        scheduled: 0,
        collected: 0,
        recycled: 0,
        disposed: 0
      },
      topContributors: [],
      recommendations: []
    };

    // Calculate age distribution
    ewasteData.forEach(item => {
      if (item.age <= 2) auditReport.itemsByAge['0-2 years']++;
      else if (item.age <= 5) auditReport.itemsByAge['3-5 years']++;
      else if (item.age <= 8) auditReport.itemsByAge['6-8 years']++;
      else auditReport.itemsByAge['9+ years']++;

      auditReport.itemsByType[item.type]++;
      auditReport.itemsByStatus[item.status]++;
    });

    // Get top contributors
    const contributorStats = {};
    ewasteData.forEach(item => {
      const userId = item.reportedBy._id.toString();
      if (!contributorStats[userId]) {
        contributorStats[userId] = {
          username: item.reportedBy.username,
          department: item.reportedBy.department,
          count: 0,
          weight: 0
        };
      }
      contributorStats[userId].count++;
      contributorStats[userId].weight += item.weight;
    });

    auditReport.topContributors = Object.values(contributorStats)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Generate recommendations
    if (auditReport.itemsByStatus.reported > auditReport.itemsByStatus.assessed) {
      auditReport.recommendations.push('Increase assessment capacity to reduce backlog');
    }
    if (auditReport.itemsByAge['9+ years'] > auditReport.totalItems * 0.3) {
      auditReport.recommendations.push('Prioritize disposal of items older than 9 years');
    }
    if (auditReport.itemsByType.hazardous > 0) {
      auditReport.recommendations.push('Ensure proper handling of hazardous materials');
    }

    res.json(auditReport);
  } catch (error) {
    res.status(500).json({ message: 'Error generating inventory audit report', error: error.message });
  }
});

// Generate traceability report
router.get('/traceability/:itemId', authenticateToken, async (req, res) => {
  try {
    const ewaste = await Ewaste.findById(req.params.itemId)
      .populate('reportedBy', 'username department email')
      .populate('vendor', 'username email');

    if (!ewaste) {
      return res.status(404).json({ message: 'E-waste item not found' });
    }

    const traceabilityReport = {
      itemId: ewaste.itemId,
      name: ewaste.name,
      category: ewaste.category,
      type: ewaste.type,
      timeline: [
        {
          date: ewaste.createdAt,
          action: 'Item reported',
          user: ewaste.reportedBy.username,
          department: ewaste.reportedBy.department,
          status: 'reported'
        }
      ],
      currentStatus: ewaste.status,
      location: ewaste.location,
      environmentalImpact: ewaste.environmentalImpact,
      qrCode: ewaste.qrCode
    };

    // Add status change timeline
    if (ewaste.status !== 'reported') {
      traceabilityReport.timeline.push({
        date: ewaste.updatedAt,
        action: `Status updated to ${ewaste.status}`,
        user: 'System',
        department: 'N/A',
        status: ewaste.status
      });
    }

    if (ewaste.scheduledPickup) {
      traceabilityReport.timeline.push({
        date: ewaste.scheduledPickup,
        action: 'Pickup scheduled',
        user: 'Admin',
        department: 'N/A',
        status: 'scheduled'
      });
    }

    if (ewaste.vendor) {
      traceabilityReport.timeline.push({
        date: ewaste.updatedAt,
        action: 'Vendor assigned',
        user: ewaste.vendor.username,
        department: 'Vendor',
        status: ewaste.status
      });
    }

    res.json(traceabilityReport);
  } catch (error) {
    res.status(500).json({ message: 'Error generating traceability report', error: error.message });
  }
});

// Generate monthly summary report
router.get('/monthly-summary', authenticateToken, async (req, res) => {
  try {
    const { year, month } = req.query;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const monthlyData = await Ewaste.find({
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const summary = {
      period: { year, month },
      totalItems: monthlyData.length,
      totalWeight: monthlyData.reduce((sum, item) => sum + item.weight, 0),
      dailyBreakdown: {},
      categoryBreakdown: {},
      departmentBreakdown: {},
      environmentalImpact: {
        co2Saved: monthlyData.reduce((sum, item) => sum + (item.environmentalImpact?.co2Saved || 0), 0),
        landfillWasteReduced: monthlyData.reduce((sum, item) => sum + (item.environmentalImpact?.landfillWasteReduced || 0), 0)
      }
    };

    // Calculate daily breakdown
    monthlyData.forEach(item => {
      const day = item.createdAt.getDate();
      if (!summary.dailyBreakdown[day]) {
        summary.dailyBreakdown[day] = { count: 0, weight: 0 };
      }
      summary.dailyBreakdown[day].count++;
      summary.dailyBreakdown[day].weight += item.weight;
    });

    // Calculate category and department breakdowns
    monthlyData.forEach(item => {
      if (!summary.categoryBreakdown[item.category]) {
        summary.categoryBreakdown[item.category] = { count: 0, weight: 0 };
      }
      summary.categoryBreakdown[item.category].count++;
      summary.categoryBreakdown[item.category].weight += item.weight;

      if (!summary.departmentBreakdown[item.department]) {
        summary.departmentBreakdown[item.department] = { count: 0, weight: 0 };
      }
      summary.departmentBreakdown[item.department].count++;
      summary.departmentBreakdown[item.department].weight += item.weight;
    });

    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: 'Error generating monthly summary report', error: error.message });
  }
});

module.exports = router;
