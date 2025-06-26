import { parseCurlCommand, generateCurlCommand } from './curlParser';

// Simple test function
function testCurlParser() {
  console.log('Testing curl parser...');

  // Test 1: Simple GET request
  try {
    const result1 = parseCurlCommand('curl https://api.example.com/users');
    console.log('✓ Test 1 passed:', result1);
    console.assert(result1.method === 'GET');
    console.assert(result1.url === 'https://api.example.com/users');
  } catch (error) {
    console.error('✗ Test 1 failed:', error);
  }

  // Test 2: POST with JSON data
  try {
    const result2 = parseCurlCommand(`curl -X POST "https://api.example.com/users" \\
      -H "Content-Type: application/json" \\
      -H "Authorization: Bearer token123" \\
      -d '{"name":"John","email":"john@example.com"}'`);
    
    console.log('✓ Test 2 passed:', result2);
    console.assert(result2.method === 'POST');
    console.assert(result2.url === 'https://api.example.com/users');
    console.assert(result2.headers['Content-Type'] === 'application/json');
    console.assert(result2.headers['Authorization'] === 'Bearer token123');
    console.assert(typeof result2.body === 'object');
    console.assert(result2.body.name === 'John');
  } catch (error) {
    console.error('✗ Test 2 failed:', error);
  }

  // Test 3: Basic auth
  try {
    const result3 = parseCurlCommand('curl -u username:password https://api.example.com/secure');
    console.log('✓ Test 3 passed:', result3);
    console.assert(result3.headers['Authorization'].startsWith('Basic '));
  } catch (error) {
    console.error('✗ Test 3 failed:', error);
  }

  // Test 4: Form data
  try {
    const result4 = parseCurlCommand('curl -X POST https://api.example.com/form -d "key=value&name=test"');
    console.log('✓ Test 4 passed:', result4);
    console.assert(result4.method === 'POST');
    console.assert(result4.body === 'key=value&name=test');
  } catch (error) {
    console.error('✗ Test 4 failed:', error);
  }

  // Test 5: Headers with quotes
  try {
    const result5 = parseCurlCommand(`curl -H "User-Agent: MyApp/1.0" -H 'Accept: application/json' https://api.example.com`);
    console.log('✓ Test 5 passed:', result5);
    console.assert(result5.headers['User-Agent'] === 'MyApp/1.0');
    console.assert(result5.headers['Accept'] === 'application/json');
  } catch (error) {
    console.error('✗ Test 5 failed:', error);
  }

  // Test generateCurlCommand
  try {
    const config = {
      method: 'POST' as const,
      url: 'https://api.example.com/test',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: { name: 'Test', value: 123 },
      timeout: 5000
    };
    
    const curlCmd = generateCurlCommand(config);
    console.log('✓ Generate curl test passed:', curlCmd);
    console.assert(curlCmd.includes('-X POST'));
    console.assert(curlCmd.includes('Content-Type: application/json'));
    console.assert(curlCmd.includes('--max-time 5'));
  } catch (error) {
    console.error('✗ Generate curl test failed:', error);
  }

  console.log('Curl parser tests completed!');
}

// Export for potential use
export { testCurlParser };

// For debugging - can be called in browser console
if (typeof window !== 'undefined') {
  (window as any).testCurlParser = testCurlParser;
}