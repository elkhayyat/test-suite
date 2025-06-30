#!/bin/bash

# Start script for MCP server with automatic .env loading

# Load environment variables from .env if it exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check required variables
if [ -z "$TEST_FLOW_AUTH_TOKEN" ]; then
    echo "❌ Error: TEST_FLOW_AUTH_TOKEN not set"
    echo "Run ./scripts/quick-setup.sh to generate tokens"
    exit 1
fi

# Determine which mode to run
MODE=${1:-stdio}

case $MODE in
    stdio|local)
        echo "🚀 Starting MCP server in stdio mode..."
        npm start
        ;;
    cloud|http)
        if [ -z "$MCP_AUTH_TOKEN" ]; then
            echo "❌ Error: MCP_AUTH_TOKEN not set (required for cloud mode)"
            exit 1
        fi
        echo "☁️  Starting MCP server in cloud/HTTP mode..."
        npm run start:cloud
        ;;
    *)
        echo "Usage: $0 [stdio|cloud]"
        echo "  stdio (default) - Local development with stdio transport"
        echo "  cloud - HTTP/SSE transport for cloud deployment"
        exit 1
        ;;
esac