// Simple test to check if MongoDB backend starts correctly
const { spawn } = require('child_process');
const axios = require('axios');

console.log('Starting MongoDB backend...');

// Start the server
const server = spawn('npm', ['run', 'dev:mongo'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  cwd: __dirname
});

let serverOutput = '';
let serverReady = false;

server.stdout.on('data', (data) => {
  const output = data.toString();
  serverOutput += output;
  process.stdout.write(output);
  
  if (output.includes('Server running on port') && !serverReady) {
    serverReady = true;
    setTimeout(testEndpoints, 2000);
  }
});

server.stderr.on('data', (data) => {
  process.stderr.write(data.toString());
});

server.on('error', (error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

async function testEndpoints() {
  try {
    console.log('\n\n=== Testing API Endpoints ===\n');
    
    // Test if server is responding
    console.log('1. Testing server health...');
    try {
      const healthResponse = await axios.get('http://localhost:3001/api/flows', {
        validateStatus: () => true
      });
      console.log('Server response status:', healthResponse.status);
      if (healthResponse.status === 401) {
        console.log('✅ Server is running and auth is working (got 401 as expected)');
      }
    } catch (error) {
      console.error('Server health check failed:', error.message);
    }
    
    // Test registration
    console.log('\n2. Testing registration endpoint...');
    try {
      const registerResponse = await axios.post('http://localhost:3001/api/auth/register', {
        email: `test${Date.now()}@example.com`,
        password: 'password123',
        name: 'Test User',
        organizationName: 'Test Organization'
      }, {
        validateStatus: () => true
      });
      
      console.log('Registration response status:', registerResponse.status);
      if (registerResponse.data.error) {
        console.error('Registration error:', registerResponse.data.error);
      } else if (registerResponse.data.user) {
        console.log('✅ Registration successful:', registerResponse.data.user.email);
      } else {
        console.log('Registration response:', JSON.stringify(registerResponse.data, null, 2));
      }
    } catch (error) {
      console.error('Registration request failed:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    console.log('\n\nStopping server...');
    server.kill();
    process.exit(0);
  }
}

// Timeout after 30 seconds
setTimeout(() => {
  if (!serverReady) {
    console.error('\n\nTimeout: Server did not start within 30 seconds');
    console.error('Server output:', serverOutput);
    server.kill();
    process.exit(1);
  }
}, 30000);