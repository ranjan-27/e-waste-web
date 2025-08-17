// Global variables
let currentUser = null;
let authToken = null;
let categoryChart = null;

// API Base URL
const API_BASE_URL = 'http://localhost:3000/api';

// DOM Elements
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const loginModal = document.getElementById('login-modal');
const signupModal = document.getElementById('signup-modal');
const dashboardModal = document.getElementById('dashboard-modal');
const closeLogin = document.getElementById('close-login');
const closeSignup = document.getElementById('close-signup');
const closeDashboard = document.getElementById('close-dashboard');
const switchToSignup = document.getElementById('switch-to-signup');
const switchToLogin = document.getElementById('switch-to-login');
const getStartedBtn = document.getElementById('get-started-btn');
const learnMoreBtn = document.getElementById('learn-more-btn');
const navToggle = document.getElementById('nav-toggle');
const navMenu = document.getElementById('nav-menu');

// Form elements
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const ewasteForm = document.getElementById('ewaste-form');
const contactForm = document.getElementById('contact-form');

// Dashboard elements
const dashboardUsername = document.getElementById('dashboard-username');
const logoutBtn = document.getElementById('logout-btn');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const totalItems = document.getElementById('total-items');
const totalWeight = document.getElementById('total-weight');
const greenScore = document.getElementById('green-score');
const recycledItems = document.getElementById('recycled-items');
const searchItem = document.getElementById('search-item');
const searchBtn = document.getElementById('search-btn');
const itemsList = document.getElementById('items-list');
const campaignsList = document.getElementById('campaigns-list');
const leaderboard = document.getElementById('leaderboard');

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    checkAuthStatus();
});

function initializeApp() {
    // Check if user is already logged in
    const token = localStorage.getItem('authToken');
    if (token) {
        authToken = token;
        fetchUserProfile();
    }
}

function setupEventListeners() {
    // Navigation
    loginBtn.addEventListener('click', () => showModal(loginModal));
    signupBtn.addEventListener('click', () => showModal(signupModal));
    getStartedBtn.addEventListener('click', () => showModal(signupModal));
    learnMoreBtn.addEventListener('click', () => document.getElementById('features').scrollIntoView({ behavior: 'smooth' }));

    // Modal controls
    closeLogin.addEventListener('click', () => hideModal(loginModal));
    closeSignup.addEventListener('click', () => hideModal(signupModal));
    closeDashboard.addEventListener('click', () => hideModal(dashboardModal));
    switchToSignup.addEventListener('click', () => {
        hideModal(loginModal);
        showModal(signupModal);
    });
    switchToLogin.addEventListener('click', () => {
        hideModal(signupModal);
        showModal(loginModal);
    });

    // Forms
    loginForm.addEventListener('submit', handleLogin);
    signupForm.addEventListener('submit', handleSignup);
    ewasteForm.addEventListener('submit', handleEwasteReport);
    contactForm.addEventListener('submit', handleContactForm);

    // Dashboard
    logoutBtn.addEventListener('click', handleLogout);
    tabBtns.forEach(btn => btn.addEventListener('click', handleTabChange));
    searchBtn.addEventListener('click', handleSearch);

    // Mobile navigation
    navToggle.addEventListener('click', toggleMobileMenu);

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            hideModal(e.target);
        }
    });

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// Modal functions
function showModal(modal) {
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function hideModal(modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Authentication functions
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    // Show loading state
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Logging In...';
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('userData', JSON.stringify(currentUser));
            
            hideModal(loginModal);
            showModal(dashboardModal);
            updateDashboard();
            showNotification('Login successful!', 'success');
        } else {
            // Handle specific error cases
            if (response.status === 503) {
                showNotification('Database connection error. Please check if the server is running properly.', 'error');
            } else if (response.status === 400) {
                showNotification(data.message || 'Invalid credentials. Please check your email and password.', 'error');
            } else {
                showNotification(data.message || 'Login failed. Please try again.', 'error');
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        
        // Check if it's a network error
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showNotification('Cannot connect to server. Please check if the server is running at http://localhost:3000', 'error');
        } else {
            showNotification('Network error. Please check your internet connection and try again.', 'error');
        }
    } finally {
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

async function handleSignup(e) {
    e.preventDefault();
    
    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const role = document.getElementById('signup-role').value;
    const department = document.getElementById('signup-department').value;

    // Validate required fields
    if (!username || !email || !password || !role || !department) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    // Validate role selection
    if (role === '') {
        showNotification('Please select a role', 'error');
        return;
    }

    // Show loading state
    const submitBtn = signupForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating Account...';
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password, role, department })
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('userData', JSON.stringify(currentUser));
            
            hideModal(signupModal);
            showModal(dashboardModal);
            updateDashboard();
            showNotification('Account created successfully!', 'success');
        } else {
            // Handle specific error cases
            if (response.status === 503) {
                showNotification('Database connection error. Please check if the server is running properly.', 'error');
            } else if (response.status === 400) {
                showNotification(data.message || 'Invalid input data. Please check your information.', 'error');
            } else {
                showNotification(data.message || 'Signup failed. Please try again.', 'error');
            }
        }
    } catch (error) {
        console.error('Signup error:', error);
        
        // Check if it's a network error
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showNotification('Cannot connect to server. Please check if the server is running at http://localhost:3000', 'error');
        } else {
            showNotification('Network error. Please check your internet connection and try again.', 'error');
        }
    } finally {
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

async function fetchUserProfile() {
    if (!authToken) return;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            currentUser = await response.json();
            localStorage.setItem('userData', JSON.stringify(currentUser));
        }
    } catch (error) {
        console.error('Error fetching user profile:', error);
    }
}

function handleLogout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    hideModal(dashboardModal);
    showNotification('Logged out successfully', 'success');
}

function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
        authToken = token;
        currentUser = JSON.parse(userData);
    }
}

// Dashboard functions
function updateDashboard() {
    if (!currentUser) return;

    // Display username and role
    const roleDisplay = currentUser.role ? ` (${currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)})` : '';
    dashboardUsername.textContent = `Welcome, ${currentUser.username}${roleDisplay}!`;
    loadDashboardData();
}

async function loadDashboardData() {
    await Promise.all([
        loadEwasteStats(),
        loadRecentEwaste(),
        loadCampaigns(),
        loadLeaderboard()
    ]);
}

async function loadEwasteStats() {
    if (!authToken) return;

    try {
        const response = await fetch(`${API_BASE_URL}/ewaste/stats/overview`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const stats = await response.json();
            updateStatsDisplay(stats);
            createCategoryChart(stats.categoryStats);
        }
    } catch (error) {
        console.error('Error loading e-waste stats:', error);
    }
}

function updateStatsDisplay(stats) {
    const overview = stats.overview;
    totalItems.textContent = overview.totalItems || 0;
    totalWeight.textContent = `${overview.totalWeight || 0} kg`;
    greenScore.textContent = currentUser?.greenScore || 0;
    recycledItems.textContent = overview.recycledItems || 0;
}

function createCategoryChart(categoryStats) {
    const ctx = document.getElementById('category-chart');
    if (!ctx) return;

    if (categoryChart) {
        categoryChart.destroy();
    }

    const labels = categoryStats.map(stat => stat._id.replace('_', ' ').toUpperCase());
    const data = categoryStats.map(stat => stat.count);

    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#10b981',
                    '#3b82f6',
                    '#f59e0b',
                    '#ef4444',
                    '#8b5cf6',
                    '#06b6d4'
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                }
            }
        }
    });
}

// Load recent e-waste items
async function loadRecentEwaste() {
    if (!authToken) return;

    try {
        const response = await fetch(`${API_BASE_URL}/ewaste?limit=5`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const items = await response.json();
            displayRecentEwaste(items);
        }
    } catch (error) {
        console.error('Error loading recent e-waste:', error);
    }
}

function displayRecentEwaste(items) {
    const overviewTab = document.getElementById('overview-tab');
    
    // Check if recent items section already exists
    let recentSection = overviewTab.querySelector('.recent-items-section');
    if (!recentSection) {
        recentSection = document.createElement('div');
        recentSection.className = 'recent-items-section';
        recentSection.innerHTML = '<h3>Recent E-Waste Items</h3>';
        overviewTab.appendChild(recentSection);
    }

    if (items.length === 0) {
        recentSection.innerHTML = '<h3>Recent E-Waste Items</h3><p class="no-data">No e-waste items reported yet.</p>';
        return;
    }

    const itemsList = items.map(item => `
        <div class="recent-item-card">
            <div class="item-header">
                <h4>${item.name}</h4>
                <span class="status-badge ${item.status}">${item.status}</span>
            </div>
            <div class="item-meta">
                <span><i class="fas fa-tag"></i> ${item.category.replace('_', ' ')}</span>
                <span><i class="fas fa-weight-hanging"></i> ${item.weight} kg</span>
                <span><i class="fas fa-map-marker-alt"></i> ${item.location?.building || 'N/A'}</span>
            </div>
            <div class="item-id">
                <small>ID: ${item.itemId}</small>
            </div>
        </div>
    `).join('');

    recentSection.innerHTML = `
        <h3>Recent E-Waste Items</h3>
        <div class="recent-items-grid">
            ${itemsList}
        </div>
    `;
}

// E-waste management functions
async function handleEwasteReport(e) {
    e.preventDefault();
    
    if (!authToken) {
        showNotification('Please login first', 'error');
        return;
    }

    // Get form data
    const name = document.getElementById('ewaste-name').value;
    const category = document.getElementById('ewaste-category').value;
    const type = document.getElementById('ewaste-type').value;
    const age = parseInt(document.getElementById('ewaste-age').value);
    const weight = parseFloat(document.getElementById('ewaste-weight').value);
    const department = document.getElementById('ewaste-department').value;
    const description = document.getElementById('ewaste-description').value;
    const building = document.getElementById('ewaste-building').value;
    const floor = document.getElementById('ewaste-floor').value;
    const room = document.getElementById('ewaste-room').value;

    // Validate required fields
    if (!name || !category || !type || !age || !weight || !department || !description || !building || !floor || !room) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    // Validate weight
    if (weight <= 0) {
        showNotification('Weight must be greater than 0', 'error');
        return;
    }

    // Validate age
    if (age < 0) {
        showNotification('Age cannot be negative', 'error');
        return;
    }

    const formData = {
        name,
        category,
        type,
        age,
        weight,
        department,
        description,
        location: {
            building,
            floor,
            room
        }
    };

    // Show loading state
    const submitBtn = ewasteForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Reporting E-Waste...';
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/ewaste`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            showNotification(`E-waste item reported successfully! Item ID: ${data.ewaste.itemId}`, 'success');
            
            // Reset form
            ewasteForm.reset();
            
            // Show success details
            showEwasteSuccess(data.ewaste, data.qrCode);
            
            // Refresh dashboard data
            loadDashboardData();
        } else {
            showNotification(data.message || 'Failed to report e-waste', 'error');
        }
    } catch (error) {
        console.error('E-waste report error:', error);
        showNotification('Network error. Please try again.', 'error');
    } finally {
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Show e-waste success details with QR code
function showEwasteSuccess(ewaste, qrCode) {
    // Create success modal
    const successModal = document.createElement('div');
    successModal.className = 'modal';
    successModal.style.display = 'block';
    
    successModal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <div style="text-align: center; padding: 20px;">
                <div style="color: #10b981; font-size: 48px; margin-bottom: 20px;">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h2 style="color: #10b981; margin-bottom: 20px;">E-Waste Reported Successfully!</h2>
                
                <div style="background: #f9fafb; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                    <h3>Item Details</h3>
                    <p><strong>Item ID:</strong> ${ewaste.itemId}</p>
                    <p><strong>Name:</strong> ${ewaste.name}</p>
                    <p><strong>Category:</strong> ${ewaste.category.replace('_', ' ')}</p>
                    <p><strong>Type:</strong> ${ewaste.type}</p>
                    <p><strong>Weight:</strong> ${ewaste.weight} kg</p>
                    <p><strong>Department:</strong> ${ewaste.department}</p>
                    <p><strong>Location:</strong> ${ewaste.location.building}, ${ewaste.location.floor}, ${ewaste.location.room}</p>
                </div>
                
                <div style="background: #f9fafb; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                    <h3>QR Code</h3>
                    <p>Scan this QR code to track your item:</p>
                    <img src="${qrCode}" alt="QR Code" style="width: 150px; height: 150px; border: 2px solid #e5e7eb;">
                </div>
                
                <div style="background: #dcfce7; padding: 15px; border-radius: 10px; border: 1px solid #10b981;">
                    <p style="margin: 0; color: #166534;">
                        <i class="fas fa-star"></i> 
                        <strong>+10 Green Score Points</strong> earned for reporting e-waste!
                    </p>
                </div>
                
                <button class="btn primary" style="margin-top: 20px;" onclick="this.parentElement.parentElement.remove()">
                    Continue
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(successModal);
    
    // Auto-close after 10 seconds
    setTimeout(() => {
        if (successModal.parentNode) {
            successModal.parentNode.removeChild(successModal);
        }
    }, 10000);
}

async function handleSearch() {
    const searchTerm = searchItem.value.trim();
    if (!searchTerm) {
        showNotification('Please enter a search term', 'error');
        return;
    }

    if (!authToken) {
        showNotification('Please login first', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/ewaste/search/qr/${searchTerm}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const item = await response.json();
            displaySearchResult(item);
        } else {
            showNotification('Item not found', 'error');
        }
    } catch (error) {
        showNotification('Network error. Please try again.', 'error');
    }
}

function displaySearchResult(item) {
    itemsList.innerHTML = `
        <div class="item-card">
            <div class="item-header">
                <h3>${item.name}</h3>
                <span class="status-badge ${item.status}">${item.status}</span>
            </div>
            <div class="item-details">
                <p><strong>ID:</strong> ${item.itemId}</p>
                <p><strong>Category:</strong> ${item.category.replace('_', ' ')}</p>
                <p><strong>Type:</strong> ${item.type}</p>
                <p><strong>Weight:</strong> ${item.weight} kg</p>
                <p><strong>Department:</strong> ${item.department}</p>
                <p><strong>Status:</strong> ${item.status}</p>
                <p><strong>Reported:</strong> ${new Date(item.createdAt).toLocaleDateString()}</p>
            </div>
            <div class="item-qr">
                <img src="${item.qrCode}" alt="QR Code" style="width: 100px; height: 100px;">
            </div>
        </div>
    `;
}

// Campaign functions
async function loadCampaigns() {
    try {
        const response = await fetch(`${API_BASE_URL}/campaigns`);
        if (response.ok) {
            const campaigns = await response.json();
            displayCampaigns(campaigns);
        }
    } catch (error) {
        console.error('Error loading campaigns:', error);
    }
}

function displayCampaigns(campaigns) {
    if (campaigns.length === 0) {
        campaignsList.innerHTML = '<p class="no-data">No campaigns available at the moment.</p>';
        return;
    }

    campaignsList.innerHTML = campaigns.map(campaign => `
        <div class="campaign-card">
            <div class="campaign-header">
                <h3>${campaign.title}</h3>
                <span class="campaign-status ${campaign.status}">${campaign.status}</span>
            </div>
            <p class="campaign-description">${campaign.description}</p>
            <div class="campaign-meta">
                <span><i class="fas fa-calendar"></i> ${new Date(campaign.startDate).toLocaleDateString()} - ${new Date(campaign.endDate).toLocaleDateString()}</span>
                <span><i class="fas fa-users"></i> ${campaign.currentParticipants}/${campaign.maxParticipants || '∞'}</span>
                <span><i class="fas fa-star"></i> ${campaign.rewards.greenScorePoints} points</span>
            </div>
            ${campaign.status === 'active' ? `<button class="btn primary join-campaign" data-id="${campaign._id}">Join Campaign</button>` : ''}
        </div>
    `).join('');

    // Add event listeners for join buttons
    document.querySelectorAll('.join-campaign').forEach(btn => {
        btn.addEventListener('click', () => joinCampaign(btn.dataset.id));
    });
}

async function joinCampaign(campaignId) {
    if (!authToken) {
        showNotification('Please login first', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/join`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('Successfully joined campaign!', 'success');
            loadCampaigns(); // Refresh campaigns
            loadDashboardData(); // Refresh dashboard
        } else {
            showNotification(data.message || 'Failed to join campaign', 'error');
        }
    } catch (error) {
        showNotification('Network error. Please try again.', 'error');
    }
}

// Leaderboard functions
async function loadLeaderboard() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/leaderboard`);
        if (response.ok) {
            const leaderboardData = await response.json();
            displayLeaderboard(leaderboardData);
        }
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

function displayLeaderboard(leaderboardData) {
    if (leaderboardData.length === 0) {
        leaderboard.innerHTML = '<p class="no-data">No leaderboard data available.</p>';
        return;
    }

    leaderboard.innerHTML = `
        <div class="leaderboard-header">
            <h3>Top Contributors</h3>
        </div>
        <div class="leaderboard-list">
            ${leaderboardData.map((user, index) => `
                <div class="leaderboard-item ${index < 3 ? 'top-three' : ''}">
                    <div class="rank">${index + 1}</div>
                    <div class="user-info">
                        <span class="username">${user.username}</span>
                        <span class="department">${user.department}</span>
                    </div>
                    <div class="scores">
                        <span class="green-score">${user.greenScore} pts</span>
                        <span class="contribution">${user.totalContribution} kg</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Tab management
function handleTabChange(e) {
    const targetTab = e.target.dataset.tab;
    
    // Update active tab button
    tabBtns.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    
    // Update active tab content
    tabContents.forEach(content => content.classList.remove('active'));
    document.getElementById(`${targetTab}-tab`).classList.add('active');
    
    // Load data for specific tabs
    if (targetTab === 'overview') {
        loadDashboardData();
    } else if (targetTab === 'campaigns') {
        loadCampaigns();
    } else if (targetTab === 'leaderboard') {
        loadLeaderboard();
    }
}

// Contact form
function handleContactForm(e) {
    e.preventDefault();
    showNotification('Thank you for your message! We will get back to you soon.', 'success');
    contactForm.reset();
}

// Mobile navigation
function toggleMobileMenu() {
    navMenu.classList.toggle('active');
}

// Utility functions
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 2rem;
        border-radius: 10px;
        color: white;
        font-weight: 500;
        z-index: 3000;
        animation: slideIn 0.3s ease;
        max-width: 300px;
    `;
    
    // Set background color based on type
    switch (type) {
        case 'success':
            notification.style.background = '#10b981';
            break;
        case 'error':
            notification.style.background = '#ef4444';
            break;
        case 'warning':
            notification.style.background = '#f59e0b';
            break;
        default:
            notification.style.background = '#3b82f6';
    }
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .item-card {
        background: white;
        padding: 1.5rem;
        border-radius: 15px;
        margin-bottom: 1rem;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        border: 1px solid #e5e7eb;
    }
    
    .item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }
    
    .status-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 500;
        text-transform: uppercase;
    }
    
    .status-badge.reported { background: #fef3c7; color: #92400e; }
    .status-badge.assessed { background: #dbeafe; color: #1e40af; }
    .status-badge.scheduled { background: #f3e8ff; color: #7c3aed; }
    .status-badge.collected { background: #dcfce7; color: #166534; }
    .status-badge.recycled { background: #d1fae5; color: #065f46; }
    .status-badge.disposed { background: #fee2e2; color: #991b1b; }
    
    .item-details p {
        margin-bottom: 0.5rem;
        color: #6b7280;
    }
    
    .item-qr {
        text-align: center;
        margin-top: 1rem;
        padding: 1rem;
        background: #f9fafb;
        border-radius: 10px;
    }
    
    .campaign-card {
        background: white;
        padding: 1.5rem;
        border-radius: 15px;
        margin-bottom: 1rem;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        border: 1px solid #e5e7eb;
    }
    
    .campaign-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }
    
    .campaign-status {
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 500;
        text-transform: uppercase;
    }
    
    .campaign-status.upcoming { background: #fef3c7; color: #92400e; }
    .campaign-status.active { background: #dcfce7; color: #166534; }
    .campaign-status.completed { background: #d1fae5; color: #065f46; }
    .campaign-status.cancelled { background: #fee2e2; color: #991b1b; }
    
    .campaign-description {
        color: #6b7280;
        margin-bottom: 1rem;
        line-height: 1.6;
    }
    
    .campaign-meta {
        display: flex;
        gap: 1rem;
        margin-bottom: 1rem;
        font-size: 0.9rem;
        color: #6b7280;
    }
    
    .campaign-meta span {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .leaderboard-header {
        background: #f9fafb;
        padding: 1rem 1.5rem;
        border-bottom: 1px solid #e5e7eb;
    }
    
    .leaderboard-header h3 {
        margin: 0;
        color: #374151;
    }
    
    .leaderboard-item {
        display: flex;
        align-items: center;
        padding: 1rem 1.5rem;
        border-bottom: 1px solid #e5e7eb;
        transition: background-color 0.3s ease;
    }
    
    .leaderboard-item:hover {
        background: #f9fafb;
    }
    
    .leaderboard-item.top-three {
        background: linear-gradient(135deg, #fef3c7, #fde68a);
    }
    
    .rank {
        width: 40px;
        height: 40px;
        background: #10b981;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        margin-right: 1rem;
    }
    
    .user-info {
        flex: 1;
        display: flex;
        flex-direction: column;
    }
    
    .username {
        font-weight: 600;
        color: #374151;
    }
    
    .department {
        font-size: 0.9rem;
        color: #6b7280;
    }
    
    .scores {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.25rem;
    }
    
    .green-score {
        font-weight: 600;
        color: #10b981;
    }
    
    .contribution {
        font-size: 0.9rem;
        color: #6b7280;
    }
    
    .no-data {
        text-align: center;
        padding: 2rem;
        color: #6b7280;
        font-style: italic;
    }
    
    .recent-items-section {
        margin-top: 2rem;
    }
    
    .recent-items-section h3 {
        margin-bottom: 1rem;
        color: #374151;
    }
    
    .recent-items-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1rem;
    }
    
    .recent-item-card {
        background: white;
        padding: 1.5rem;
        border-radius: 15px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        border: 1px solid #e5e7eb;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    
    .recent-item-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }
    
    .recent-item-card .item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }
    
    .recent-item-card .item-header h4 {
        margin: 0;
        color: #374151;
        font-size: 1.1rem;
    }
    
    .recent-item-card .item-meta {
        display: flex;
        gap: 1rem;
        margin-bottom: 1rem;
        font-size: 0.9rem;
        color: #6b7280;
    }
    
    .recent-item-card .item-meta span {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .recent-item-card .item-id {
        color: #9ca3af;
        font-size: 0.8rem;
    }
    
    .form-instructions {
        background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
        padding: 1.5rem;
        border-radius: 15px;
        margin-bottom: 2rem;
        border: 1px solid #bae6fd;
    }
    
    .form-instructions h3 {
        color: #0369a1;
        margin: 0 0 0.5rem 0;
        font-size: 1.3rem;
    }
    
    .form-instructions p {
        color: #0c4a6e;
        margin: 0;
        line-height: 1.6;
    }
`;
document.head.appendChild(style);