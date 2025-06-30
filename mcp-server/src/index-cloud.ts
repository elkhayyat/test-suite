import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import cors from 'cors';
import { OpenAPIFlowGenerator } from './openapi-flow-generator.js';
import { FlowRunner } from './flow-runner.js';
import { TestAnalyzer } from './test-analyzer.js';
import { ApiClient } from './api-client.js';
import crypto from 'crypto';
import { config } from './config.js';

const app = express();
const PORT = config.port;
const API_BASE_URL = config.testFlowApiUrl;
const AUTH_TOKEN = config.testFlowAuthToken;
const MCP_AUTH_TOKEN = config.mcpAuthToken;

if (!AUTH_TOKEN) {
  console.error('TEST_FLOW_AUTH_TOKEN environment variable is required');
  process.exit(1);
}

if (!MCP_AUTH_TOKEN) {
  console.error('MCP_AUTH_TOKEN environment variable is required for cloud deployment');
  process.exit(1);
}

// Middleware
app.use(cors({
  origin: config.allowedOrigins,
  credentials: true,
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Authentication middleware
const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }
  
  const token = authHeader.substring(7);
  
  if (token !== MCP_AUTH_TOKEN) {
    res.status(403).json({ error: 'Invalid authentication token' });
    return;
  }
  
  next();
};

// MCP endpoint
app.post('/mcp', authenticate, async (req, res) => {
  const transport = new SSEServerTransport('/messages', res);
  
  const server = new Server(
    {
      name: 'test-flow-suite',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const apiClient = new ApiClient(API_BASE_URL, AUTH_TOKEN);
  const openApiGenerator = new OpenAPIFlowGenerator(apiClient);
  const flowRunner = new FlowRunner(apiClient);
  const testAnalyzer = new TestAnalyzer();

  // Tool: Create flows from OpenAPI schema
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'create_flows_from_openapi',
          description: 'Create test flows from an OpenAPI schema',
          inputSchema: {
            type: 'object',
            properties: {
              schemaUrl: {
                type: 'string',
                description: 'URL to fetch the OpenAPI schema from (optional if schema is provided)',
              },
              schema: {
                type: 'object',
                description: 'OpenAPI schema object (optional if schemaUrl is provided)',
              },
              projectId: {
                type: 'string',
                description: 'Project ID to create flows in',
              },
              folderId: {
                type: 'string',
                description: 'Folder ID to create flows in (optional)',
              },
              baseUrl: {
                type: 'string',
                description: 'Base URL to use for requests (overrides schema servers)',
              },
              includeOptions: {
                type: 'object',
                properties: {
                  includePaths: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Specific paths to include (e.g., ["/users/*", "/products"])',
                  },
                  includeMethods: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'HTTP methods to include (e.g., ["GET", "POST"])',
                  },
                  includeTags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'OpenAPI tags to include',
                  },
                },
              },
            },
            required: ['projectId'],
            oneOf: [
              { required: ['schemaUrl'] },
              { required: ['schema'] }
            ],
          },
        },
        {
          name: 'run_flow',
          description: 'Run a specific test flow',
          inputSchema: {
            type: 'object',
            properties: {
              flowId: {
                type: 'string',
                description: 'ID of the flow to run',
              },
              environmentId: {
                type: 'string',
                description: 'Environment ID to use for variables',
              },
              selectedSteps: {
                type: 'array',
                items: { type: 'string' },
                description: 'Specific step IDs to run (optional, runs all if not provided)',
              },
            },
            required: ['flowId'],
          },
        },
        {
          name: 'run_folder',
          description: 'Run all flows in a folder',
          inputSchema: {
            type: 'object',
            properties: {
              folderId: {
                type: 'string',
                description: 'ID of the folder containing flows to run',
              },
              environmentId: {
                type: 'string',
                description: 'Environment ID to use for variables',
              },
              parallel: {
                type: 'boolean',
                description: 'Run flows in parallel (default: false)',
              },
            },
            required: ['folderId'],
          },
        },
        {
          name: 'run_project',
          description: 'Run all flows in a project',
          inputSchema: {
            type: 'object',
            properties: {
              projectId: {
                type: 'string',
                description: 'ID of the project containing flows to run',
              },
              environmentId: {
                type: 'string',
                description: 'Environment ID to use for variables',
              },
              parallel: {
                type: 'boolean',
                description: 'Run flows in parallel (default: false)',
              },
            },
            required: ['projectId'],
          },
        },
        {
          name: 'analyze_test_run',
          description: 'Analyze a test run and explain errors',
          inputSchema: {
            type: 'object',
            properties: {
              testRunId: {
                type: 'string',
                description: 'ID of the test run to analyze',
              },
              includeSuccessful: {
                type: 'boolean',
                description: 'Include analysis of successful steps (default: false)',
              },
            },
            required: ['testRunId'],
          },
        },
        {
          name: 'get_recent_test_runs',
          description: 'Get recent test runs with optional filtering',
          inputSchema: {
            type: 'object',
            properties: {
              flowId: {
                type: 'string',
                description: 'Filter by flow ID',
              },
              projectId: {
                type: 'string',
                description: 'Filter by project ID',
              },
              status: {
                type: 'string',
                enum: ['pending', 'running', 'completed', 'failed'],
                description: 'Filter by status',
              },
              limit: {
                type: 'number',
                description: 'Number of results to return (default: 10)',
              },
            },
          },
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'create_flows_from_openapi': {
          if (!args) throw new Error('Arguments required');
          const result = await openApiGenerator.generateFlows(args as any);
          return {
            content: [
              {
                type: 'text',
                text: `Successfully created ${result.flowsCreated} flows from OpenAPI schema:\n${result.flows.map(f => `- ${f.name}`).join('\n')}`,
              },
            ],
          };
        }

        case 'run_flow': {
          if (!args) throw new Error('Arguments required');
          const result = await flowRunner.runFlow((args as any).flowId, {
            environmentId: (args as any).environmentId,
            selectedSteps: (args as any).selectedSteps,
          });
          const analysis = await testAnalyzer.analyzeRun(result);
          return {
            content: [
              {
                type: 'text',
                text: `Test run ${result.id} completed with status: ${result.status}\n\n${analysis}`,
              },
            ],
          };
        }

        case 'run_folder': {
          if (!args) throw new Error('Arguments required');
          const results = await flowRunner.runFolder((args as any).folderId, {
            environmentId: (args as any).environmentId,
            parallel: (args as any).parallel,
          });
          const summary = testAnalyzer.summarizeMultipleRuns(results);
          return {
            content: [
              {
                type: 'text',
                text: summary,
              },
            ],
          };
        }

        case 'run_project': {
          if (!args) throw new Error('Arguments required');
          const results = await flowRunner.runProject((args as any).projectId, {
            environmentId: (args as any).environmentId,
            parallel: (args as any).parallel,
          });
          const summary = testAnalyzer.summarizeMultipleRuns(results);
          return {
            content: [
              {
                type: 'text',
                text: summary,
              },
            ],
          };
        }

        case 'analyze_test_run': {
          if (!args) throw new Error('Arguments required');
          const testRun = await apiClient.getTestRun((args as any).testRunId);
          const analysis = await testAnalyzer.analyzeRun(testRun, {
            includeSuccessful: (args as any).includeSuccessful,
          });
          return {
            content: [
              {
                type: 'text',
                text: analysis,
              },
            ],
          };
        }

        case 'get_recent_test_runs': {
          const runs = await apiClient.getTestRuns(args as any);
          const summary = runs.map(run => 
            `${run.flowName} (${run.id}): ${run.status} - ${new Date(run.startTime).toLocaleString()}`
          ).join('\n');
          return {
            content: [
              {
                type: 'text',
                text: `Recent test runs:\n${summary}`,
              },
            ],
          };
        }

        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Tool ${name} not found`
          );
      }
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  });

  await server.connect(transport);
});

// Start server
app.listen(PORT, () => {
  console.log(`Test Flow Suite MCP server (cloud) running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
});