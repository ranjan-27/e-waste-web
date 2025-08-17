# Smart E-Waste Management System

A comprehensive web-based system for managing electronic waste disposal with QR tracking, smart categorization, and compliance reporting.

## Features

### 🏠 Centralized E-Waste Management Portal
- Log, track, and manage disposal of e-waste items
- Department-wise categorization and tracking
- Age and weight-based classification

### 📱 QR Code-Based Tagging System
- Unique QR code generation for each e-waste item
- Complete traceability from reporting to final disposal
- Mobile-friendly QR code scanning

### 🤖 Smart Categorization and Scheduling
- Automated classification (recyclable, reusable, hazardous)
- Pickup scheduling with registered vendors
- Status tracking throughout the disposal process

### 📊 Compliance and Reporting Module
- Auto-generated reports for environmental compliance
- CPCB and E-Waste (Management) Rules integration
- Inventory audits and traceability reports

### 👥 User Engagement and Awareness
- Sustainability education campaigns
- E-waste collection challenges
- Green scoreboards and participation incentives
- Student and faculty engagement features

### 📈 Data Analytics Dashboard
- E-waste volume trends analysis
- Segment-wise contribution insights
- Recovery rates and environmental impact metrics
- Interactive charts and visualizations

## Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **QRCode** - QR code generation

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with animations
- **JavaScript (ES6+)** - Interactive functionality
- **Chart.js** - Data visualization
- **Font Awesome** - Icons
- **Responsive Design** - Mobile-first approach

## Installation and Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

### Step 1: Clone the Repository
```bash
git clone <repository-url>
cd smart-ewaste-management
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Environment Configuration
Create a `.env` file in the root directory:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/ewaste_management
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
```

### Step 4: Start MongoDB
Make sure MongoDB is running on your system:
```bash
# On Windows
net start MongoDB

# On macOS/Linux
sudo systemctl start mongod
```

### Step 5: Run the Application
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The application will be available at `http://localhost:3000`

## Project Structure

```
smart-ewaste-management/
├── models/                 # MongoDB schemas
│   ├── User.js           # User model
│   ├── Ewaste.js         # E-waste item model
│   └── Campaign.js       # Campaign model
├── routes/                # API endpoints
│   ├── auth.js           # Authentication routes
│   ├── ewaste.js         # E-waste management routes
│   ├── users.js          # User management routes
│   ├── reports.js        # Reporting routes
│   └── campaigns.js      # Campaign routes
├── public/                # Frontend assets
│   ├── index.html        # Main HTML file
│   ├── styles.css        # CSS styles
│   └── script.js         # JavaScript functionality
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### E-Waste Management
- `POST /api/ewaste` - Report new e-waste item
- `GET /api/ewaste` - Get all e-waste items
- `GET /api/ewaste/:id` - Get specific e-waste item
- `PATCH /api/ewaste/:id/status` - Update item status
- `GET /api/ewaste/stats/overview` - Get statistics
- `GET /api/ewaste/search/qr/:itemId` - Search by QR code

### User Management
- `GET /api/users/leaderboard` - Get user leaderboard
- `GET /api/users/leaderboard/department/:dept` - Department leaderboard
- `GET /api/users/stats` - User statistics

### Reports
- `GET /api/reports/compliance` - Compliance reports
- `GET /api/reports/inventory-audit` - Inventory audit
- `GET /api/reports/traceability/:itemId` - Item traceability
- `GET /api/reports/monthly-summary` - Monthly summaries

### Campaigns
- `POST /api/campaigns` - Create campaign (admin)
- `GET /api/campaigns` - Get all campaigns
- `POST /api/campaigns/:id/join` - Join campaign
- `POST /api/campaigns/:id/leave` - Leave campaign

## Usage Guide

### 1. User Registration and Login
- Click "Sign Up" to create a new account
- Fill in username, email, password, and department
- Use "Login" to access existing accounts

### 2. Dashboard Navigation
- **Overview**: View statistics and charts
- **Report E-Waste**: Submit new e-waste items
- **Track Items**: Search and view e-waste items
- **Campaigns**: Participate in sustainability campaigns
- **Leaderboard**: View top contributors

### 3. Reporting E-Waste
- Fill in item details (name, category, type, age, weight)
- Select department and provide description
- Submit to generate QR code and tracking ID

### 4. Tracking Items
- Use search functionality to find items by ID or name
- View complete item details and status
- Access generated QR codes for physical tracking

### 5. Participating in Campaigns
- Browse available sustainability campaigns
- Join active campaigns to earn green points
- Track participation and rewards

## Database Schema

### User Collection
```javascript
{
  username: String,
  email: String,
  password: String (hashed),
  role: String (admin/user/vendor),
  department: String,
  greenScore: Number,
  totalContribution: Number,
  createdAt: Date
}
```

### E-Waste Collection
```javascript
{
  itemId: String,
  name: String,
  category: String,
  type: String,
  description: String,
  department: String,
  reportedBy: ObjectId (ref: User),
  status: String,
  age: Number,
  weight: Number,
  qrCode: String,
  location: Object,
  scheduledPickup: Date,
  vendor: ObjectId (ref: User),
  environmentalImpact: Object,
  createdAt: Date,
  updatedAt: Date
}
```

### Campaign Collection
```javascript
{
  title: String,
  description: String,
  type: String,
  startDate: Date,
  endDate: Date,
  targetAudience: [String],
  maxParticipants: Number,
  currentParticipants: Number,
  rewards: Object,
  status: String,
  createdBy: ObjectId (ref: User),
  participants: [Object],
  createdAt: Date
}
```

## Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcryptjs for secure password storage
- **Rate Limiting** - API request throttling
- **Input Validation** - Server-side data validation
- **CORS Protection** - Cross-origin resource sharing control

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Email: info@ewastemanager.com
- Phone: +91 98765 43210
- Address: Mumbai, Maharashtra, India

## Future Enhancements

- **Mobile App**: Native iOS and Android applications
- **IoT Integration**: Smart sensors for automated e-waste detection
- **Blockchain**: Immutable tracking and certification
- **AI/ML**: Predictive analytics for e-waste generation
- **API Integration**: Third-party vendor and recycling center APIs
- **Multi-language Support**: Internationalization for global use

---

**Note**: This system is designed for educational and demonstration purposes. For production use, ensure proper security measures, data backup strategies, and compliance with local regulations.
