const fs = require('fs');
const path = require('path');

// Define available plans
const PLANS = {
  basic: {
    id: 'basic',
    name: 'Basic Plan',
    price: 9,
    storageLimitMB: 47, // 41 MB limit for Basic plan
    features: [
      'Basic document management',
      'Standard support',
      'Up to 10 users',
      'Basic security features'
    ],
    isPopular: false
  },
  pro: {
    id: 'pro',
    name: 'Pro Plan',
    price: 29,
    storageLimitMB: 25000, // 25 GB
    features: [
      'Advanced document management',
      'Priority support',
      'Up to 50 users',
      'Document versioning',
      'Advanced security features'
    ],
    isPopular: true
  },
  mega: {
    id: 'mega',
    name: 'Mega Plan',
    price: 79,
    storageLimitMB: 100000, // 100 GB
    features: [
      'Enterprise document management',
      '24/7 premium support',
      'Unlimited users',
      'Advanced security features',
      'Custom integrations',
      'API access'
    ],
    isPopular: false
  }
};

// File to store the current plan
const PLAN_FILE = path.join(__dirname, '../data/current_plan.json');

// Ensure the data directory exists
const ensureDataDir = () => {
  const dataDir = path.dirname(PLAN_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// Get all available plans
const getAllPlans = () => {
  return Object.values(PLANS);
};

// Get a specific plan by ID
const getPlanById = (planId) => {
  return PLANS[planId] || null;
};

// Get the current plan (this would typically be stored in a database)
// For now, we'll use a simple in-memory storage
let currentPlanId = 'basic';

const getCurrentPlan = () => {
  return PLANS[currentPlanId] || PLANS.basic;
};

const setCurrentPlan = (planId) => {
  if (PLANS[planId]) {
    currentPlanId = planId;
    return true;
  }
  return false;
};

// Get plan details
const getPlanDetails = (planName) => {
  return PLANS[planName] || null;
};

// Check if storage usage exceeds the plan limit
const isStorageExceeded = (currentUsageMB, planName) => {
  const plan = PLANS[planName];
  if (!plan) return false;
  
  return currentUsageMB > plan.storageLimitMB;
};

// Get storage limit for a plan
const getStorageLimit = (planName) => {
  const plan = PLANS[planName];
  return plan ? plan.storageLimitMB : 0;
};

module.exports = {
  PLANS,
  getAllPlans,
  getPlanById,
  getCurrentPlan,
  setCurrentPlan,
  getPlanDetails,
  isStorageExceeded,
  getStorageLimit
}; 