# MCP Token Setup Guide

This guide explains how to generate, configure, and use MCP authentication tokens for secure access to your Test Flow Suite MCP server.

## What is MCP_AUTH_TOKEN?

The `MCP_AUTH_TOKEN` is a security token that authenticates requests to your MCP server. It acts as a shared secret between your MCP server and Claude Desktop (or other MCP clients).

## Generating Tokens

### Method 1: Using the Token Generator Script

```bash
cd mcp-server
node scripts/generate-token.js
```

This will output:
```
🔐 Generated Secure Tokens:

MCP_AUTH_TOKEN=a1b2c3d4e5f6...
TEST_FLOW_AUTH_TOKEN=x9y8z7w6v5...
```

### Method 2: Manual Generation

#### On macOS/Linux:
```bash
# Generate a 64-character hex token
openssl rand -hex 32

# Generate a base64 token
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### On Windows (PowerShell):
```powershell
# Generate random bytes and convert to hex
-join ((1..32) | ForEach-Object {'{0:X2}' -f (Get-Random -Max 256)})
```

### Method 3: Online Token Generators

⚠️ **NOT RECOMMENDED for production** - Use only for testing:
- [Random.org](https://www.random.org/strings/)
- UUID generators (though UUIDs are less secure than random tokens)

## Setting Up Tokens

### 1. Local Development

Create a `.env` file in the `mcp-server` directory:

```bash
# Copy the example file
cp .env.example .env

# Edit with your tokens
MCP_AUTH_TOKEN=your-generated-mcp-token-here
TEST_FLOW_AUTH_TOKEN=your-test-flow-api-token-here
```

### 2. Docker Deployment

Set environment variables in `docker-compose.yml`:

```yaml
environment:
  - MCP_AUTH_TOKEN=${MCP_AUTH_TOKEN}
  - TEST_FLOW_AUTH_TOKEN=${TEST_FLOW_AUTH_TOKEN}
```

Or pass them when running:
```bash
docker run -e MCP_AUTH_TOKEN=your-token -e TEST_FLOW_AUTH_TOKEN=api-token ...
```

### 3. Cloud Provider Setup

#### AWS (Secrets Manager)

```bash
# Create the secret
aws secretsmanager create-secret \
  --name mcp-auth-token \
  --secret-string "your-generated-token"

# Update existing secret
aws secretsmanager update-secret \
  --secret-id mcp-auth-token \
  --secret-string "your-new-token"
```

#### Google Cloud (Secret Manager)

```bash
# Enable Secret Manager API
gcloud services enable secretmanager.googleapis.com

# Create the secret
echo -n "your-generated-token" | gcloud secrets create mcp-auth-token --data-file=-

# Grant access to Cloud Run service
gcloud secrets add-iam-policy-binding mcp-auth-token \
  --role roles/secretmanager.secretAccessor \
  --member serviceAccount:YOUR-SERVICE-ACCOUNT
```

#### Azure (Key Vault)

```bash
# Create a key vault
az keyvault create --name TestFlowVault --resource-group test-flow-rg

# Add the secret
az keyvault secret set \
  --vault-name TestFlowVault \
  --name mcp-auth-token \
  --value "your-generated-token"
```

#### Kubernetes (Secrets)

```bash
# Create secret
kubectl create secret generic test-flow-secrets \
  --from-literal=mcp-auth-token="your-generated-token" \
  --from-literal=auth-token="your-api-token" \
  -n test-flow

# Update existing secret
kubectl create secret generic test-flow-secrets \
  --from-literal=mcp-auth-token="your-new-token" \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Configuring Claude Desktop

Once your MCP server is deployed with the token, configure Claude Desktop:

### 1. Local Development (stdio)

```json
{
  "mcpServers": {
    "test-flow-suite": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"],
      "env": {
        "TEST_FLOW_API_URL": "http://localhost:3001",
        "TEST_FLOW_AUTH_TOKEN": "your-api-token",
        "MCP_AUTH_TOKEN": "your-mcp-token"
      }
    }
  }
}
```

### 2. Cloud Deployment (HTTP)

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

Replace `YOUR_MCP_AUTH_TOKEN` with your actual token.

## Security Best Practices

### 1. Token Rotation

Rotate tokens regularly (e.g., every 90 days):

```bash
# Generate new token
NEW_TOKEN=$(node scripts/generate-token.js | grep MCP_AUTH_TOKEN | cut -d'=' -f2)

# Update in your cloud provider
# Then update Claude Desktop configuration
```

### 2. Token Storage

**DO:**
- ✅ Use environment variables
- ✅ Use cloud provider secret management
- ✅ Use `.env` files (add to `.gitignore`)
- ✅ Encrypt tokens at rest

**DON'T:**
- ❌ Commit tokens to version control
- ❌ Include tokens in Docker images
- ❌ Log tokens in application logs
- ❌ Share tokens via insecure channels

### 3. Access Control

- Use different tokens for different environments (dev/staging/prod)
- Implement token scopes if needed (read-only vs read-write)
- Monitor token usage and implement rate limiting

### 4. Token Format Guidelines

- **Length**: Minimum 32 characters (256 bits)
- **Character Set**: Alphanumeric (hex or base64)
- **Avoid**: Sequential patterns, dictionary words, personal information

## Troubleshooting

### "Invalid authentication token" Error

1. **Check token matches exactly:**
   ```bash
   # On server
   echo $MCP_AUTH_TOKEN
   
   # In Claude Desktop config
   # Ensure no extra spaces or quotes
   ```

2. **Verify Authorization header format:**
   ```bash
   # Test with curl
   curl -H "Authorization: Bearer your-token" https://your-server/health
   ```

3. **Check for special characters:**
   - If using special characters, ensure proper escaping in JSON
   - Consider using only alphanumeric tokens

### Token Not Loading

1. **Environment variable not set:**
   ```bash
   # Check if set
   printenv | grep MCP_AUTH_TOKEN
   ```

2. **Docker not passing environment:**
   ```bash
   # Check inside container
   docker exec container-name printenv | grep MCP_AUTH_TOKEN
   ```

3. **Cloud secrets not accessible:**
   - Check IAM permissions
   - Verify secret name matches
   - Check service account has access

## Testing Your Setup

### 1. Test Health Endpoint (No Auth Required)

```bash
curl https://your-mcp-server.com/health
```

Expected: `{"status":"healthy","version":"1.0.0"}`

### 2. Test MCP Endpoint (Auth Required)

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_MCP_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  https://your-mcp-server.com/mcp \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

Expected: List of available tools

### 3. Test with Wrong Token

```bash
curl -X POST \
  -H "Authorization: Bearer wrong-token" \
  https://your-mcp-server.com/mcp
```

Expected: `{"error":"Invalid authentication token"}`

## Advanced Configuration

### Using Multiple Tokens

For different access levels:

```javascript
// In your config.ts
export const tokens = {
  admin: process.env.MCP_ADMIN_TOKEN,
  readonly: process.env.MCP_READONLY_TOKEN,
};

// In authentication
const providedToken = authHeader.substring(7);
const isAdmin = providedToken === tokens.admin;
const isReadOnly = providedToken === tokens.readonly;
```

### Token Expiration

Implement token expiration using JWTs:

```bash
npm install jsonwebtoken
```

```javascript
import jwt from 'jsonwebtoken';

// Generate expiring token
const token = jwt.sign(
  { role: 'mcp-client' },
  process.env.JWT_SECRET,
  { expiresIn: '30d' }
);

// Verify in middleware
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
} catch (err) {
  // Token expired or invalid
}
```

## Getting Help

If you're having issues with token setup:

1. Check the [troubleshooting section](#troubleshooting) above
2. Review server logs for authentication errors
3. Test with curl before configuring Claude Desktop
4. Ensure your cloud provider secrets are properly configured

Remember: Never share your actual tokens when asking for help!