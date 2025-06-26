const axios = require('axios');

async function testVariableInterpolation() {
  try {
    console.log('Testing variable interpolation...');
    
    // Get the flow that uses {{baseUrl}}
    const flowsResponse = await axios.get('http://localhost:3001/api/flows');
    const flows = flowsResponse.data;
    console.log('Available flows:', flows.map(f => ({ id: f.id, name: f.name })));
    
    // Find the flow that uses baseUrl
    const testFlow = flows.find(f => f.steps.some(s => s.config.url && s.config.url.includes('{{baseUrl}}')));
    if (!testFlow) {
      console.log('No flow found that uses {{baseUrl}}');
      return;
    }
    
    console.log('Found test flow:', testFlow.name, 'ID:', testFlow.id);
    
    // Start the test run
    const runResponse = await axios.post('http://localhost:3001/api/runs', {
      flowId: testFlow.id,
      environmentId: 'default'
    });
    
    console.log('Test run started:', runResponse.data);
    
    // Wait a bit for the run to complete
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Get the run results
    const runResultResponse = await axios.get(`http://localhost:3001/api/runs/${runResponse.data.runId}`);
    console.log('Run results:', JSON.stringify(runResultResponse.data, null, 2));
    
  } catch (error) {
    console.error('Error testing variable interpolation:', error.response?.data || error.message);
  }
}

testVariableInterpolation();