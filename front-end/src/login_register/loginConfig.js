// Login Page Configuration
// Choose which login page design to use

export const LOGIN_CONFIG = {
  // Available designs:
  // - 'modern': Clean modern design with gradient background
  // - 'split': Split layout with welcome section and form
  // - 'pro': Professional enterprise design with advanced animations
  
  // Change this to switch between designs
  activeDesign: 'pro', // Options: 'modern', 'split', 'pro'
  
  // Design descriptions
  designs: {
    modern: {
      name: 'Modern Gradient',
      description: 'Clean modern design with animated gradient background',
      file: 'loginPage.js'
    },
    split: {
      name: 'Split Layout',
      description: 'Split screen with welcome section and login form',
      file: 'loginPageAlt.js'
    },
    pro: {
      name: 'Professional Enterprise',
      description: 'Professional design with advanced animations and features',
      file: 'loginPagePro.js'
    }
  },
  
  // Animation settings
  animations: {
    enabled: true,
    duration: 0.8,
    staggerDelay: 0.2
  },
  
  // Background settings
  background: {
    type: 'gradient', // 'gradient', 'image', 'pattern'
    colors: ['#000B1E', '#1A1B4B', '#2D1B69', '#000B1E'],
    pattern: true,
    floatingElements: true
  },
  
  // Form settings
  form: {
    glassmorphism: true,
    backdropBlur: '3xl',
    borderOpacity: 0.1,
    focusRing: true
  },
  
  // Button settings
  button: {
    gradient: true,
    hoverEffects: true,
    loadingAnimation: true
  }
};

// Helper function to get the active login component
export const getActiveLoginComponent = () => {
  const design = LOGIN_CONFIG.activeDesign;
  const designInfo = LOGIN_CONFIG.designs[design];
  
  switch (design) {
    case 'modern':
      return require('./loginPage').default;
    case 'split':
      return require('./loginPageAlt').default;
    case 'pro':
      return require('./loginPagePro').default;
    default:
      return require('./loginPage').default;
  }
};

// Helper function to get design info
export const getDesignInfo = () => {
  return LOGIN_CONFIG.designs[LOGIN_CONFIG.activeDesign];
};

export default LOGIN_CONFIG;
