# Test Flow Suite MCP Server

This MCP (Model Context Protocol) server enables AI assistants to interact with the Test Flow Suite platform for creating, running, and analyzing automated tests.

## Features

- **OpenAPI Integration**: Generate test flows from OpenAPI/Swagger schemas
- **Test Execution**: Run individual flows, folders, or entire projects
- **Test Analysis**: Analyze test results with AI-powered error explanations
- **Real-time Updates**: Monitor test execution progress
- **Cloud Ready**: Deploy to AWS, Google Cloud, Azure, or Kubernetes

## Quick Start

### 1. Automated Setup (Recommended)

```bash
cd mcp-server
./scripts/quick-setup.sh
```

This script will:
- Generate secure tokens automatically
- Create your `.env` file
- Build the project
- Display your configuration

### 2. Manual Setup

#### Generate Tokens

```bash
# Using npm script
npm run generate-token

# Or manually
openssl rand -hex 32
```

#### Configure Environment

Create a `.env` file:
```bash
cp .env.example .env
```

Set your tokens:
- `MCP_AUTH_TOKEN`: Your generated MCP authentication token
- `TEST_FLOW_AUTH_TOKEN`: Your Test Flow API token
- `TEST_FLOW_API_URL`: Your Test Flow API URL

#### Build and Run

```bash
npm install
npm run build

# For local development (stdio)
npm start

# For cloud deployment (HTTP/SSE)
npm run start:cloud
```

## Token Setup Guide

### What is MCP_AUTH_TOKEN?

The `MCP_AUTH_TOKEN` is a security token that authenticates requests to your MCP server. It's required for cloud deployments and acts as a shared secret between your MCP server and Claude Desktop.

### Generating Secure Tokens

```bash
# Recommended: Use the built-in generator
npm run generate-token

# Alternative methods:
# macOS/Linux
openssl rand -hex 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Security Best Practices

- **Never commit tokens** to version control
- **Use different tokens** for dev/staging/production
- **Rotate tokens** regularly (every 90 days)
- **Store tokens securely** in cloud secret managers
- **Use strong tokens**: Minimum 32 characters

For detailed token setup instructions, see [docs/MCP_TOKEN_SETUP.md](./docs/MCP_TOKEN_SETUP.md).

## Claude Desktop Configuration

### Local Development (stdio)

```json
{
  "mcpServers": {
    "test-flow-suite": {
      "command": "node",
      "args": ["/path/to/test-flow-suite/mcp-server/dist/index.js"],
      "env": {
        "TEST_FLOW_API_URL": "http://localhost:3001",
        "TEST_FLOW_AUTH_TOKEN": "your-api-token"
      }
    }
  }
}
```

### Cloud Deployment (HTTP)

```json
{
  "mcpServers": {
    "test-flow-suite": {
      "command": "curl",
      "args": [
        "-X", "POST",
        "-H", "Authorization: Bearer YOUR_MCP_AUTH_TOKEN",
        "-H", "Content-Type: application/json",
        "--no-buffer",
        "https://your-mcp-server.com/mcp"
      ]
    }
  }
}
```

See [examples/claude-desktop-config.json](./examples/claude-desktop-config.json) for more configuration examples.

## Available Tools

### 1. `create_flows_from_openapi`

Generate test flows from an OpenAPI schema.

```json
{
  "tool": "create_flows_from_openapi",
  "arguments": {
    "schemaUrl": "https://api.example.com/openapi.json",
    "projectId": "123",
    "baseUrl": "https://api.example.com",
    "includeOptions": {
      "includeMethods": ["GET", "POST"],
      "includeTags": ["users", "products"]
    }
  }
}
```

### 2. `run_flow`

Run a specific test flow.

```json
{
  "tool": "run_flow",
  "arguments": {
    "flowId": "flow-123",
    "environmentId": "env-456"
  }
}
```

### 3. `run_folder` / `run_project`

Run all flows in a folder or project.

```json
{
  "tool": "run_folder",
  "arguments": {
    "folderId": "folder-123",
    "parallel": true
  }
}
```

### 4. `analyze_test_run`

Analyze test results with error explanations.

```json
{
  "tool": "analyze_test_run",
  "arguments": {
    "testRunId": "run-123",
    "includeSuccessful": false
  }
}
```

### 5. `get_recent_test_runs`

Get recent test runs with filtering.

```json
{
  "tool": "get_recent_test_runs",
  "arguments": {
    "status": "failed",
    "limit": 10
  }
}
```

## Cloud Deployment

The MCP server can be deployed to any cloud provider:

- **AWS**: ECS Fargate, Lambda
- **Google Cloud**: Cloud Run
- **Azure**: Container Instances
- **Kubernetes**: Any K8s cluster

### Quick Deploy

```bash
# Deploy to AWS
./deploy/deploy.sh -p aws -r YOUR_ECR_REPO

# Deploy to Google Cloud
./deploy/deploy.sh -p gcp -r gcr.io/YOUR_PROJECT/test-flow-mcp

# Deploy to Azure
./deploy/deploy.sh -p azure -r YOUR_ACR.azurecr.io/test-flow-mcp

# Deploy to Kubernetes
./deploy/deploy.sh -p k8s -r YOUR_REGISTRY/test-flow-mcp
```

See [CLOUD_DEPLOYMENT.md](./CLOUD_DEPLOYMENT.md) for detailed deployment instructions.

## Development

### Project Structure

```
mcp-server/
├── src/
│   ├── index.ts              # Local stdio server
│   ├── index-cloud.ts        # Cloud HTTP/SSE server
│   ├── config.ts             # Configuration management
│   ├── api-client.ts         # Test Flow API client
│   ├── openapi-flow-generator.ts
│   ├── flow-runner.ts
│   └── test-analyzer.ts
├── scripts/
│   ├── generate-token.js     # Token generator
│   └── quick-setup.sh        # Setup script
├── deploy/                   # Cloud deployment configs
├── examples/                 # Configuration examples
└── docs/                     # Documentation
```

### Adding New Tools

1. Define the tool in `ListToolsRequestSchema` handler
2. Add implementation in `CallToolRequestSchema` handler
3. Update this README with tool documentation

## Troubleshooting

### Authentication Errors

1. **"Invalid authentication token"**
   - Verify token matches exactly (no extra spaces)
   - Check Authorization header format: `Bearer YOUR_TOKEN`
   - Ensure MCP_AUTH_TOKEN is set in environment

2. **"Missing or invalid authorization header"**
   - Cloud deployment requires MCP_AUTH_TOKEN
   - Check Claude Desktop configuration

### Connection Issues

1. **Cannot connect to Test Flow API**
   - Verify TEST_FLOW_API_URL is correct
   - Check TEST_FLOW_AUTH_TOKEN is valid
   - Ensure API is accessible from MCP server

2. **Health check failing**
   - Check server is running on configured PORT
   - Verify environment variables are loaded
   - Review container/server logs

### Testing Your Setup

```bash
# Test health endpoint (no auth)
curl http://localhost:3002/health

# Test MCP endpoint (requires auth)
curl -X POST \
  -H "Authorization: Bearer YOUR_MCP_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:3002/mcp \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Support

- **Documentation**: See the `docs/` directory
- **Token Setup**: [docs/MCP_TOKEN_SETUP.md](./docs/MCP_TOKEN_SETUP.md)
- **Cloud Deployment**: [CLOUD_DEPLOYMENT.md](./CLOUD_DEPLOYMENT.md)
- **Examples**: [examples/](./examples/)

## License

This MCP server is part of the Test Flow Suite project.