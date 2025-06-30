# Cloud Deployment Guide for Test Flow MCP Server

This guide covers deploying the Test Flow Suite MCP server to various cloud providers.

## Prerequisites

- Docker installed locally
- Cloud provider CLI tools (AWS CLI, gcloud, az, kubectl)
- Container registry access
- Test Flow Suite API deployed and accessible

## Environment Variables

Required environment variables for cloud deployment:

- `TEST_FLOW_API_URL`: URL of your Test Flow Suite API
- `TEST_FLOW_AUTH_TOKEN`: Authentication token for Test Flow API
- `MCP_AUTH_TOKEN`: Authentication token for MCP server access
- `PORT`: Server port (default: 3002)
- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins

## Quick Start

1. **Build and test locally:**
   ```bash
   cd mcp-server
   docker-compose up --build
   ```

2. **Deploy to your cloud provider:**
   ```bash
   ./deploy/deploy.sh -p <provider> -r <registry> -t <tag>
   ```

## AWS Deployment

### Using ECS Fargate

1. **Create ECR repository:**
   ```bash
   aws ecr create-repository --repository-name test-flow-mcp-server
   ```

2. **Authenticate Docker to ECR:**
   ```bash
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
   ```

3. **Create secrets in AWS Secrets Manager:**
   ```bash
   aws secretsmanager create-secret --name test-flow-api-url --secret-string "https://your-api.com"
   aws secretsmanager create-secret --name test-flow-auth-token --secret-string "your-token"
   aws secretsmanager create-secret --name mcp-auth-token --secret-string "your-mcp-token"
   ```

4. **Deploy:**
   ```bash
   ./deploy/deploy.sh -p aws -r 123456789.dkr.ecr.us-east-1.amazonaws.com/test-flow-mcp-server
   ```

### Using Lambda (Serverless)

For serverless deployment, you'll need to use the AWS Lambda Web Adapter. Contact support for serverless deployment guide.

## Google Cloud Deployment

### Using Cloud Run

1. **Enable required APIs:**
   ```bash
   gcloud services enable run.googleapis.com containerregistry.googleapis.com
   ```

2. **Create secrets:**
   ```bash
   echo -n "https://your-api.com" | gcloud secrets create test-flow-api-url --data-file=-
   echo -n "your-token" | gcloud secrets create test-flow-auth-token --data-file=-
   echo -n "your-mcp-token" | gcloud secrets create mcp-auth-token --data-file=-
   ```

3. **Deploy:**
   ```bash
   ./deploy/deploy.sh -p gcp -r gcr.io/your-project/test-flow-mcp-server
   ```

4. **Make service public (if needed):**
   ```bash
   gcloud run services add-iam-policy-binding test-flow-mcp-server \
     --member="allUsers" \
     --role="roles/run.invoker"
   ```

## Azure Deployment

### Using Container Instances

1. **Create resource group:**
   ```bash
   az group create --name test-flow-rg --location eastus
   ```

2. **Create container registry:**
   ```bash
   az acr create --resource-group test-flow-rg --name testflowregistry --sku Basic
   ```

3. **Login to ACR:**
   ```bash
   az acr login --name testflowregistry
   ```

4. **Deploy:**
   ```bash
   ./deploy/deploy.sh -p azure -r testflowregistry.azurecr.io/test-flow-mcp-server
   ```

## Kubernetes Deployment

### Any Kubernetes Cluster

1. **Create namespace:**
   ```bash
   kubectl create namespace test-flow
   ```

2. **Create secrets:**
   ```bash
   kubectl create secret generic test-flow-secrets \
     --from-literal=api-url="https://your-api.com" \
     --from-literal=auth-token="your-token" \
     --from-literal=mcp-auth-token="your-mcp-token" \
     -n test-flow
   ```

3. **Deploy:**
   ```bash
   ./deploy/deploy.sh -p k8s -r docker.io/yourusername/test-flow-mcp-server
   ```

4. **Check deployment status:**
   ```bash
   kubectl get pods -n test-flow
   kubectl get svc -n test-flow
   ```

## Security Best Practices

1. **Use secrets management:**
   - Never hardcode sensitive values
   - Use cloud provider secret management services
   - Rotate tokens regularly

2. **Network security:**
   - Use VPC/VNet for internal communication
   - Configure security groups/firewall rules
   - Use HTTPS/TLS for all communication

3. **Authentication:**
   - Always require MCP_AUTH_TOKEN
   - Consider implementing OAuth2/JWT
   - Use API Gateway for additional security

4. **Monitoring:**
   - Enable cloud provider logging
   - Set up alerts for errors and high latency
   - Monitor resource usage

## Connecting Claude Desktop to Cloud MCP Server

Once deployed, configure Claude Desktop to use your cloud MCP server:

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

## Troubleshooting

### Health Check Failures
- Ensure the server is running on the configured PORT
- Check environment variables are set correctly
- Review container logs

### Authentication Errors
- Verify MCP_AUTH_TOKEN is set and matches client config
- Check TEST_FLOW_AUTH_TOKEN is valid
- Ensure CORS origins are configured correctly

### Connection Issues
- Verify network connectivity to Test Flow API
- Check firewall rules and security groups
- Ensure DNS resolution is working

## Cost Optimization

- Use auto-scaling with minimum instances
- Consider serverless options for low traffic
- Monitor and optimize resource allocation
- Use spot/preemptible instances for non-critical workloads