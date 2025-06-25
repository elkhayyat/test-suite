import { TestFlow } from '../../../shared/src/types';

export const sampleFlows: TestFlow[] = [
  {
    id: 'sample-api-test',
    name: 'Sample API Test',
    description: 'Tests a REST API endpoint with assertions',
    steps: [
      {
        id: 'step1',
        type: 'http',
        name: 'Get Users',
        config: {
          method: 'GET',
          url: 'https://jsonplaceholder.typicode.com/users',
          headers: {
            'Accept': 'application/json'
          }
        },
        position: { x: 100, y: 100 }
      },
      {
        id: 'step2',
        type: 'assertion',
        name: 'Check Status',
        config: {
          type: 'equals',
          source: '${step1.status}',
          expected: 200
        },
        position: { x: 300, y: 100 }
      },
      {
        id: 'step3',
        type: 'assertion',
        name: 'Check User Count',
        config: {
          type: 'custom',
          source: '${step1.data}',
          customScript: 'return data.length === 10;'
        },
        position: { x: 500, y: 100 }
      }
    ],
    connections: [
      {
        id: 'edge1',
        source: 'step1',
        target: 'step2'
      },
      {
        id: 'edge2',
        source: 'step2',
        target: 'step3'
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'sample-web-test',
    name: 'Sample Web Test',
    description: 'Tests a web application with browser automation',
    steps: [
      {
        id: 'step1',
        type: 'browser',
        name: 'Navigate to Google',
        config: {
          action: 'navigate',
          value: 'https://www.google.com'
        },
        position: { x: 100, y: 100 }
      },
      {
        id: 'step2',
        type: 'browser',
        name: 'Type Search Query',
        config: {
          action: 'type',
          selector: 'input[name="q"]',
          value: 'test automation'
        },
        position: { x: 300, y: 100 }
      },
      {
        id: 'step3',
        type: 'delay',
        name: 'Wait 1 second',
        config: {
          duration: 1000
        },
        position: { x: 500, y: 100 }
      },
      {
        id: 'step4',
        type: 'browser',
        name: 'Take Screenshot',
        config: {
          action: 'screenshot'
        },
        position: { x: 700, y: 100 }
      }
    ],
    connections: [
      {
        id: 'edge1',
        source: 'step1',
        target: 'step2'
      },
      {
        id: 'edge2',
        source: 'step2',
        target: 'step3'
      },
      {
        id: 'edge3',
        source: 'step3',
        target: 'step4'
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];