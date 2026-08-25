// config.js - Simple Configuration for Novel November
// Just change these values when switching between development and production

// ============================================
// 🔧 CHANGE THESE VALUES HERE
// ============================================

// FOR DEVELOPMENT - Use this URL when testing locally
// const BASE_URL = 'your-url';

// FOR PRODUCTION - Use this URL when deploying
const BASE_URL = 'your-url';

// ============================================
// Don't change anything below this line
// ============================================

window.APP_CONFIG = {
    // Backend API URL
    BACKEND_URL: BASE_URL + 'your-url',
    
    // Auth URLs - Change this if your are not using Catalyst Login system
    AUTH_LOGIN_URL: BASE_URL + '/__catalyst/auth/login',
    AUTH_SIGNUP_URL: BASE_URL + '/__catalyst/auth/signup',
    AUTH_LOGOUT_URL: BASE_URL + '/__catalyst/auth/logout',
};

console.log('✅ Config loaded - Backend URL:', window.APP_CONFIG.BACKEND_URL);
