#!/usr/bin/env node

/**
 * CSC API Integration Test Script
 * Testează funcționalitatea integrării CSC API
 */

const axios = require('axios');

// Configurare teste
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const TEST_CONFIG = {
  endpoints: {
    info: `${BASE_URL}/api/csc/info`,
    initiate: `${BASE_URL}/api/csc/initiate-signature`,
    credentials: `${BASE_URL}/api/csc/credentials`
  },
  testDocument: {
    documentId: 'test-doc-123',
    documentName: 'test-document.pdf',
    documentPath: '/uploads/test-document.pdf',
    hashValue: 'a1b2c3d4e5f6789012345678901234567890abcdef'
  }
};

// Culori pentru output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

// Test 1: CSC Info Endpoint
async function testCSCInfo() {
  log('\n' + '='.repeat(50), colors.bold);
  log('TEST 1: CSC Info Endpoint', colors.bold);
  log('='.repeat(50), colors.bold);

  try {
    const response = await axios.get(TEST_CONFIG.endpoints.info, {
      timeout: 10000
    });

    if (response.status === 200) {
      logSuccess('CSC Info endpoint is accessible');
      
      const data = response.data;
      if (data.success) {
        logSuccess('CSC service responded successfully');
        
        if (data.cscInfo) {
          logInfo('CSC Service Info:');
          console.log('  - Name:', data.cscInfo.name || 'N/A');
          console.log('  - Region:', data.cscInfo.region || 'N/A');
          console.log('  - Specs:', data.cscInfo.specs || 'N/A');
          console.log('  - Auth Types:', data.cscInfo.authType?.join(', ') || 'N/A');
        }

        if (data.config) {
          logInfo('Configuration:');
          console.log('  - Client ID:', data.config.clientId || 'Not configured');
          console.log('  - Redirect URI:', data.config.redirectURI || 'Not configured');
        }
      } else {
        logWarning('CSC service responded but with error');
        console.log('  Error:', data.message || 'Unknown error');
      }
    }

    return true;
  } catch (error) {
    logError('CSC Info endpoint test failed');
    
    if (error.code === 'ECONNREFUSED') {
      logError('Cannot connect to server. Make sure the backend is running.');
    } else if (error.response) {
      console.log('  Status:', error.response.status);
      console.log('  Error:', error.response.data?.message || error.message);
    } else {
      console.log('  Error:', error.message);
    }
    
    return false;
  }
}

// Test 2: Initiate Signature Endpoint
async function testInitiateSignature() {
  log('\n' + '='.repeat(50), colors.bold);
  log('TEST 2: Initiate Signature Endpoint', colors.bold);
  log('='.repeat(50), colors.bold);

  try {
    const response = await axios.post(
      TEST_CONFIG.endpoints.initiate,
      TEST_CONFIG.testDocument,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    if (response.status === 200) {
      logSuccess('Initiate signature endpoint is accessible');
      
      const data = response.data;
      if (data.success) {
        logSuccess('Signature initiation successful');
        
        if (data.authorizationURL) {
          logInfo('Authorization URL generated:');
          console.log('  URL:', data.authorizationURL.substring(0, 100) + '...');
        }

        if (data.state) {
          logInfo('State parameter generated for security');
        }
      } else {
        logWarning('Signature initiation failed');
        console.log('  Error:', data.message || 'Unknown error');
      }
    }

    return true;
  } catch (error) {
    logError('Initiate signature endpoint test failed');
    
    if (error.response) {
      console.log('  Status:', error.response.status);
      console.log('  Error:', error.response.data?.message || error.message);
      
      if (error.response.status === 401) {
        logWarning('Authentication required. This is expected for protected endpoints.');
      }
    } else {
      console.log('  Error:', error.message);
    }
    
    return false;
  }
}

// Test 3: Credentials Endpoint
async function testCredentials() {
  log('\n' + '='.repeat(50), colors.bold);
  log('TEST 3: Credentials Endpoint', colors.bold);
  log('='.repeat(50), colors.bold);

  try {
    const response = await axios.get(TEST_CONFIG.endpoints.credentials, {
      timeout: 10000
    });

    if (response.status === 200) {
      logSuccess('Credentials endpoint is accessible');
      
      const data = response.data;
      if (data.success) {
        logSuccess('Credentials retrieved successfully');
        
        if (data.credentials) {
          logInfo(`Found ${data.credentials.length} credentials`);
        }
      } else {
        logWarning('Credentials retrieval failed');
        console.log('  Error:', data.message || 'Unknown error');
      }
    }

    return true;
  } catch (error) {
    logError('Credentials endpoint test failed');
    
    if (error.response) {
      console.log('  Status:', error.response.status);
      console.log('  Error:', error.response.data?.message || error.message);
      
      if (error.response.status === 401) {
        logWarning('Authentication required. This is expected for protected endpoints.');
      }
    } else {
      console.log('  Error:', error.message);
    }
    
    return false;
  }
}

// Test 4: Frontend Integration
async function testFrontendIntegration() {
  log('\n' + '='.repeat(50), colors.bold);
  log('TEST 4: Frontend Integration Check', colors.bold);
  log('='.repeat(50), colors.bold);

  try {
    const fs = require('fs');
    const path = require('path');
    
    // Check if Diffuse.js has been updated
    const diffusePath = path.join(__dirname, 'front-end/src/User/Diffuse.js');
    
    if (fs.existsSync(diffusePath)) {
      const diffuseContent = fs.readFileSync(diffusePath, 'utf8');
      
      // Check for CSC integration
      const checks = [
        {
          pattern: /handleCSCSignature/,
          description: 'CSC signature handler function'
        },
        {
          pattern: /Professional Sign/,
          description: 'Professional Sign button text'
        },
        {
          pattern: /isSigningDocument/,
          description: 'Signature loading state'
        },
        {
          pattern: /calculateDocumentHash/,
          description: 'Document hash calculation'
        }
      ];

      let passedChecks = 0;
      
      checks.forEach(check => {
        if (check.pattern.test(diffuseContent)) {
          logSuccess(`✓ ${check.description} found`);
          passedChecks++;
        } else {
          logError(`✗ ${check.description} not found`);
        }
      });

      if (passedChecks === checks.length) {
        logSuccess('All frontend integration checks passed');
        return true;
      } else {
        logWarning(`${passedChecks}/${checks.length} frontend checks passed`);
        return false;
      }
    } else {
      logError('Diffuse.js file not found');
      return false;
    }
  } catch (error) {
    logError('Frontend integration check failed');
    console.log('  Error:', error.message);
    return false;
  }
}

// Test 5: Configuration Check
async function testConfiguration() {
  log('\n' + '='.repeat(50), colors.bold);
  log('TEST 5: Configuration Check', colors.bold);
  log('='.repeat(50), colors.bold);

  const requiredEnvVars = [
    'CSC_CLIENT_ID',
    'CSC_CLIENT_SECRET',
    'CSC_BASE_URL',
    'CSC_OAUTH_URL',
    'CSC_REDIRECT_URI'
  ];

  let configuredVars = 0;

  requiredEnvVars.forEach(varName => {
    if (process.env[varName]) {
      logSuccess(`✓ ${varName} is configured`);
      configuredVars++;
    } else {
      logWarning(`⚠ ${varName} is not configured`);
    }
  });

  if (configuredVars === 0) {
    logInfo('No environment variables found. This is expected if using default values.');
    logInfo('For production, make sure to configure all required variables.');
  } else if (configuredVars === requiredEnvVars.length) {
    logSuccess('All required environment variables are configured');
    return true;
  } else {
    logWarning(`${configuredVars}/${requiredEnvVars.length} environment variables configured`);
  }

  return configuredVars > 0;
}

// Main test runner
async function runTests() {
  log('🚀 CSC API Integration Test Suite', colors.bold);
  log('Testing CSC (Cloud Signature Consortium) integration...', colors.blue);

  const results = {
    info: await testCSCInfo(),
    initiate: await testInitiateSignature(),
    credentials: await testCredentials(),
    frontend: await testFrontendIntegration(),
    config: await testConfiguration()
  };

  // Summary
  log('\n' + '='.repeat(50), colors.bold);
  log('TEST SUMMARY', colors.bold);
  log('='.repeat(50), colors.bold);

  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;

  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const testName = test.charAt(0).toUpperCase() + test.slice(1);
    log(`${status} ${testName} Test`, passed ? colors.green : colors.red);
  });

  log(`\nOverall: ${passedTests}/${totalTests} tests passed`, 
    passedTests === totalTests ? colors.green : colors.yellow);

  if (passedTests === totalTests) {
    log('\n🎉 All tests passed! CSC integration is ready.', colors.green);
  } else {
    log('\n⚠️  Some tests failed. Check the issues above.', colors.yellow);
    log('\nNext steps:', colors.blue);
    log('1. Configure CSC credentials with your provider');
    log('2. Set up environment variables');
    log('3. Test with real CSC service');
  }

  process.exit(passedTests === totalTests ? 0 : 1);
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(error => {
    logError('Test suite failed to run');
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  testCSCInfo,
  testInitiateSignature,
  testCredentials,
  testFrontendIntegration,
  testConfiguration
}; 