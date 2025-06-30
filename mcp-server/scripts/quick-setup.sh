#!/bin/bash

# Quick setup script for MCP server

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Test Flow Suite MCP Server Quick Setup${NC}\n"

# Check if .env exists
if [ -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file already exists. Backing up to .env.backup${NC}"
    cp .env .env.backup
fi

# Copy example env file
echo "📋 Creating .env file from example..."
cp .env.example .env

# Generate tokens
echo -e "\n🔐 Generating secure tokens..."
MCP_TOKEN=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
API_TOKEN=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Update .env file
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/your-secure-mcp-auth-token/$MCP_TOKEN/g" .env
    sed -i '' "s/your-test-flow-auth-token/$API_TOKEN/g" .env
else
    # Linux
    sed -i "s/your-secure-mcp-auth-token/$MCP_TOKEN/g" .env
    sed -i "s/your-test-flow-auth-token/$API_TOKEN/g" .env
fi

echo -e "${GREEN}✅ Tokens generated and saved to .env${NC}"

# Ask about Test Flow API URL
echo -e "\n🌐 Test Flow API Configuration"
read -p "Enter your Test Flow API URL (default: http://localhost:3001): " API_URL
API_URL=${API_URL:-http://localhost:3001}

if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|TEST_FLOW_API_URL=.*|TEST_FLOW_API_URL=$API_URL|g" .env
else
    sed -i "s|TEST_FLOW_API_URL=.*|TEST_FLOW_API_URL=$API_URL|g" .env
fi

# Build the project
echo -e "\n🔨 Building the project..."
npm install
npm run build

echo -e "\n${GREEN}✅ Setup complete!${NC}"
echo -e "\n📝 Your configuration:"
echo -e "   MCP_AUTH_TOKEN: ${YELLOW}$MCP_TOKEN${NC}"
echo -e "   TEST_FLOW_API_URL: ${YELLOW}$API_URL${NC}"

echo -e "\n🚀 Next steps:"
echo -e "1. Start the server:"
echo -e "   ${YELLOW}npm run start:cloud${NC} (for cloud/HTTP mode)"
echo -e "   ${YELLOW}npm start${NC} (for local/stdio mode)"
echo -e "\n2. Configure Claude Desktop with your MCP_AUTH_TOKEN"
echo -e "   See ${YELLOW}docs/MCP_TOKEN_SETUP.md${NC} for details"
echo -e "\n3. For cloud deployment:"
echo -e "   ${YELLOW}./deploy/deploy.sh -p <provider> -r <registry>${NC}"

# Save token for easy reference
echo -e "\n💾 Tokens saved to: ${YELLOW}.env${NC}"
echo -e "⚠️  ${RED}Keep these tokens secret!${NC} Never commit .env to version control."