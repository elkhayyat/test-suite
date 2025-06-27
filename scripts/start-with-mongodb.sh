#!/bin/bash

echo "Test Flow Suite - MongoDB Setup"
echo "==============================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Check if MongoDB is already running
if docker ps | grep -q test-flow-suite-mongodb; then
    echo "MongoDB is already running."
else
    echo "Starting MongoDB with Docker Compose..."
    docker-compose up -d
    echo "Waiting for MongoDB to be ready..."
    sleep 5
fi

# Show MongoDB status
echo ""
echo "MongoDB Status:"
docker-compose ps

# Set environment variables
export MONGODB_URL="mongodb://localhost:27017/test-flow-suite"
export MONGODB_DB_NAME="test-flow-suite"
export PORT=3001

echo ""
echo "Starting backend server with MongoDB..."
echo "MongoDB URL: $MONGODB_URL"
echo "Server will run on port: $PORT"
echo ""

# Navigate to backend directory and start the server
cd backend && npm run dev:mongo