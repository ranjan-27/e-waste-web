const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// MongoDB Connection with better error handling
let isConnected = false;
let fallbackMode = false;

async function connectToMongoDB() {
  try {
    // Try local MongoDB first
  const mongoURI = 'mongodb://127.0.0.1:27017/ewaste_management';
    
    console.log('🔄 Connecting to local MongoDB...');

    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // 5 second timeout
      socketTimeoutMS: 45000, // 45 second timeout
    });

    isConnected = true;
    fallbackMode = false;
    console.log('✅ Connected to local MongoDB successfully!');
  } catch (error) {
    console.error('❌ Local MongoDB connection failed:', error.message);
    console.log('\n🔧 Starting in fallback mode with in-memory storage...');
    
    // Enable fallback mode for testing
    isConnected = false;
    fallbackMode = true;
    
    // Create fallback data storage
    global.fallbackData = {
      users: [],
      ewaste: [],
      campaigns: []
    };
    
    console.log('⚠️  Running in fallback mode - data will not persist between restarts');
    console.log('💡 To enable full database functionality:');
    console.log('   1. Install MongoDB Community Server from: https://www.mongodb.com/try/download/community');
    console.log('   2. Or use MongoDB Atlas (cloud): https://www.mongodb.com/atlas');
  }
}

// Test database connection
connectToMongoDB();

// Database connection event handlers
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
  isConnected = false;
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
  isConnected = false;
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/ewaste', require('./routes/ewaste'));
app.use('/api/users', require('./routes/users'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/campaigns', require('./routes/campaigns'));

// Serve the main application
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: isConnected ? 'connected' : 'disconnected',
    message: isConnected ? 'All systems operational' : 'Database connection issue detected'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Check if it's a database connection error
  if (!isConnected && (req.path.startsWith('/api/auth') || req.path.startsWith('/api/ewaste'))) {
    return res.status(503).json({ 
      message: 'Database connection error. Please check if MongoDB is running.',
      error: 'Database unavailable'
    });
  }
  
  res.status(500).json({ message: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Frontend available at: http://localhost:${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
});
