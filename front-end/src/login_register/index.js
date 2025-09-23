// Login Page Index
// This file exports the active login component based on configuration

import LOGIN_CONFIG from './loginConfig';

// Import all login components
import LoginPage from './loginPage';
import LoginPageAlt from './loginPageAlt';
import LoginPagePro from './loginPagePro';

// Export the active login component
const getActiveLoginComponent = () => {
  switch (LOGIN_CONFIG.activeDesign) {
    case 'modern':
      return LoginPage;
    case 'split':
      return LoginPageAlt;
    case 'pro':
      return LoginPagePro;
    default:
      return LoginPage;
  }
};

// Export the active component as default
export default getActiveLoginComponent();

// Export all components for manual use
export { LoginPage, LoginPageAlt, LoginPagePro };

// Export configuration
export { LOGIN_CONFIG };
