#!/bin/bash

# Docker setup script for local MCP server

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🐳 Test Flow Suite MCP Server - Docker Setup${NC}\n"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Docker installation
if ! command_exists docker; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker from https://www.docker.com/get-started"
    exit 1
fi

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running${NC}"
    echo "Please start Docker Desktop"
    exit 1
fi

echo -e "${GREEN}✅ Docker is installed and running${NC}\n"

# Build the project first
echo -e "${YELLOW}📦 Building the project...${NC}"
cd "$(dirname "$0")/../.."
npm install
npm run build

# Build Docker image
echo -e "\n${YELLOW}🔨 Building Docker image...${NC}"
cd mcp-server
docker-compose -f docker-compose.local.yml build

echo -e "\n${GREEN}✅ Docker image built successfully!${NC}"

# Create convenience script
cat > run-mcp-docker.sh << 'EOF'
#!/bin/bash

# Run MCP server in Docker

# Check if API URL is provided
API_URL=${1:-http://host.docker.internal:3001}

echo "Starting MCP server with API URL: $API_URL"

docker run --rm -it \
  -e TEST_FLOW_API_URL="$API_URL" \
  --name test-flow-mcp \
  test-flow-mcp-server:local
EOF

chmod +x run-mcp-docker.sh

echo -e "\n${GREEN}✅ Setup complete!${NC}"
echo -e "\n📝 Claude Desktop Configuration:"
echo -e "${YELLOW}Add this to your Claude Desktop config:${NC}\n"

cat << 'EOF'
{
  "mcpServers": {
    "test-flow-suite": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "TEST_FLOW_API_URL=http://host.docker.internal:3001",
        "-e", "TEST_FLOW_AUTH_TOKEN=YOUR_API_TOKEN_HERE",
        "test-flow-mcp-server:local"
      ]
    }
  }
}
EOF

echo -e "\n${BLUE}Replace YOUR_API_TOKEN_HERE with your actual API token from Test Flow Suite${NC}"
echo -e "\n🚀 To run manually: ${YELLOW}./run-mcp-docker.sh [API_URL]${NC}"
echo -e "\n💡 Tips:"
echo -e "  - Use ${YELLOW}host.docker.internal${NC} to connect to localhost from Docker"
echo -e "  - Generate API tokens from the Test Flow Suite web interface"
echo -e "  - The Docker image includes all dependencies - no local Node.js required!"