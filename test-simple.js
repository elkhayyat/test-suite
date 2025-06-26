const http = require('http');

function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: JSON.parse(responseData)
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function test() {
  try {
    console.log('Getting flows...');
    const flowsResponse = await makeRequest('http://localhost:3001/api/flows');
    const flows = flowsResponse.data;
    console.log('Found flows:', flows.length);
    
    const testFlow = flows.find(f => f.steps.some(s => s.config.url && s.config.url.includes('{{baseUrl}}')));
    if (!testFlow) {
      console.log('No flow found that uses baseUrl');
      return;
    }
    
    console.log('Testing flow:', testFlow.name);
    console.log('Flow steps using baseUrl:', testFlow.steps.filter(s => s.config.url && s.config.url.includes('{{baseUrl}}')).map(s => s.config.url));
    
    // Start test run
    const runResponse = await makeRequest('http://localhost:3001/api/runs', 'POST', {
      flowId: testFlow.id,
      environmentId: 'default'
    });
    
    console.log('Started run:', runResponse.data.runId);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();