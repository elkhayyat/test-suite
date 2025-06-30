# User Token Guide for Test Flow Suite MCP Server

This guide explains how users can generate their own API tokens to grant Claude Desktop access to their Test Flow Suite account.

## Overview

The Test Flow Suite MCP server now supports user-specific API tokens. This allows:
- Each user to have their own secure access
- Fine-grained permissions control
- Token revocation without affecting other users
- Audit trail of API usage

## Step 1: Generate an API Token

1. **Log in to Test Flow Suite**
   - Navigate to your Test Flow Suite instance
   - Log in with your credentials

2. **Navigate to API Tokens**
   - Click on "API Tokens" in the left sidebar
   - You'll see a list of your existing tokens (if any)

3. **Create a New Token**
   - Click the "Generate New Token" button
   - Fill in the form:
     - **Token Name**: Give it a descriptive name (e.g., "Claude Desktop")
     - **Permissions**: Select the permissions needed:
       - `read`: View flows, projects, and test results
       - `write`: Create and modify flows
       - `execute`: Run tests
       - `admin`: Full access (not recommended for MCP)
     - **Expires In**: Choose an expiration period (90 days recommended)
   - Click "Generate Token"

4. **Save Your Token**
   - **IMPORTANT**: Copy the token immediately! It won't be shown again
   - The token will look like: `tfs_a1b2c3d4e5f6...`
   - Store it securely (password manager recommended)

## Step 2: Set Up MCP Server

### Option A: Using Docker (Recommended)

1. **Install Docker**
   - Download from [docker.com](https://docker.com)
   - Start Docker Desktop

2. **Set up MCP Server**
   ```bash
   # Clone the repository
   git clone <repository-url>
   cd test-flow-suite/mcp-server

   # Run the setup script
   ./scripts/docker-setup.sh
   ```

3. **Configure Claude Desktop**
   Add this to your Claude Desktop config:
   ```json
   {
     "mcpServers": {
       "test-flow-suite": {
         "command": "docker",
         "args": [
           "run", "--rm", "-i",
           "-e", "TEST_FLOW_API_URL=YOUR_API_URL",
           "-e", "TEST_FLOW_AUTH_TOKEN=YOUR_TOKEN_HERE",
           "test-flow-mcp-server:local"
         ]
       }
     }
   }
   ```

### Option B: Local Node.js Installation

1. **Prerequisites**
   - Node.js 18+ installed
   - npm or yarn

2. **Install and Build**
   ```bash
   cd test-flow-suite/mcp-server
   npm install
   npm run build
   ```

3. **Configure Claude Desktop**
   ```json
   {
     "mcpServers": {
       "test-flow-suite": {
         "command": "node",
         "args": ["/path/to/mcp-server/dist/index.js"],
         "env": {
           "TEST_FLOW_API_URL": "YOUR_API_URL",
           "TEST_FLOW_AUTH_TOKEN": "YOUR_TOKEN_HERE"
         }
       }
     }
   }
   ```

## Step 3: Test Your Setup

1. **Restart Claude Desktop** after updating the configuration

2. **In a new Claude conversation**, you should see Test Flow Suite tools available:
   - `create_flows_from_openapi`
   - `run_flow`
   - `run_folder`
   - `analyze_test_run`
   - `get_recent_test_runs`

3. **Test a command**:
   ```
   "Can you show me my recent test runs?"
   ```

## Security Best Practices

### Token Management
- **Never share your token** publicly or commit it to version control
- **Use separate tokens** for different applications
- **Rotate tokens regularly** (every 90 days)
- **Revoke unused tokens** from the API Tokens page

### Permission Guidelines
- **Minimal permissions**: Only grant what's needed
- **Avoid admin permission** for MCP usage
- **Typical MCP permissions**: `read`, `write`, `execute`

### Secure Storage
- **Password managers**: Store tokens in 1Password, Bitwarden, etc.
- **Environment files**: If using `.env`, add to `.gitignore`
- **Never hardcode** tokens in scripts or config files

## Troubleshooting

### "Invalid or expired API token"
1. Check token hasn't expired (view in API Tokens page)
2. Ensure you copied the complete token including `tfs_` prefix
3. Verify no extra spaces or quotes in configuration

### "Cannot connect to Test Flow API"
1. Check `TEST_FLOW_API_URL` is correct
2. Ensure your Test Flow Suite instance is accessible
3. Try the URL in a browser first

### "Permission denied"
1. Check your token has required permissions
2. Some operations may require `write` or `execute` permissions
3. Review token permissions in the UI

### Docker Issues
1. Ensure Docker Desktop is running
2. Check Docker has network access
3. Use `host.docker.internal` for localhost URLs

## Token Lifecycle

### Creating Tokens
- Tokens are generated with cryptographically secure randomness
- Each token is unique and tied to your user account
- Tokens inherit your user permissions

### Using Tokens
- Include in Authorization header: `Bearer tfs_your_token`
- Tokens are validated on each request
- Last used timestamp is updated automatically

### Revoking Tokens
- Soft revoke: Token becomes inactive but remains in history
- Hard delete: Complete removal from system
- Immediate effect - no delay in revocation

## API Rate Limits

- Default: 100 requests per minute per token
- Burst: Up to 200 requests allowed
- Headers show remaining quota
- 429 status code when exceeded

## Need Help?

### Documentation
- [MCP Server README](./README.md)
- [API Documentation](../docs/API.md)
- [Claude Desktop Docs](https://docs.anthropic.com/claude/docs/claude-desktop)

### Support Channels
- GitHub Issues for bugs
- Discord community for questions
- Email support for enterprise customers

## Example Use Cases

### 1. Creating Flows from OpenAPI
```
"Create test flows from https://api.example.com/openapi.json in my API Tests project"
```

### 2. Running Regression Tests
```
"Run all flows in the Regression Tests folder"
```

### 3. Analyzing Failures
```
"Analyze the failed test run and explain what went wrong"
```

### 4. Monitoring Test Results
```
"Show me test runs from the last 24 hours that failed"
```

Remember: Your API token grants access to your Test Flow Suite data. Keep it secure!