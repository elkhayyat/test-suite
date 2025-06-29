const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

async function testAuth() {
  try {
    console.log('1. Testing registration...');
    const registerResponse = await axios.post(`${API_URL}/auth/register`, {
      email: 'testuser@example.com',
      password: 'password123',
      name: 'Test User',
      organizationName: 'Test Organization'
    });
    console.log('Registration successful:', registerResponse.data.user.email);
    const token = registerResponse.data.token;

    console.log('\n2. Testing login...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'testuser@example.com',
      password: 'password123'
    });
    console.log('Login successful:', loginResponse.data.user.email);

    console.log('\n3. Testing authenticated request...');
    const meResponse = await axios.get(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('Authenticated request successful:', meResponse.data.user.email);

    console.log('\n4. Testing protected endpoint...');
    const projectsResponse = await axios.get(`${API_URL}/projects`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('Protected endpoint accessible, projects:', projectsResponse.data.length);

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Wait a bit for server to start if needed
setTimeout(() => {
  testAuth();
}, 2000);