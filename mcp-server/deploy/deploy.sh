#!/bin/bash

# Deployment script for Test Flow MCP Server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
PROVIDER=""
IMAGE_TAG="latest"
REGISTRY=""

# Function to print colored output
print_color() {
    color=$1
    message=$2
    echo -e "${color}${message}${NC}"
}

# Function to show usage
usage() {
    echo "Usage: $0 -p <provider> -r <registry> [-t <tag>]"
    echo ""
    echo "Options:"
    echo "  -p <provider>   Cloud provider (aws|gcp|azure|k8s)"
    echo "  -r <registry>   Container registry URL"
    echo "  -t <tag>        Image tag (default: latest)"
    echo ""
    echo "Examples:"
    echo "  $0 -p aws -r 123456789.dkr.ecr.us-east-1.amazonaws.com/test-flow-mcp"
    echo "  $0 -p gcp -r gcr.io/my-project/test-flow-mcp"
    echo "  $0 -p azure -r myregistry.azurecr.io/test-flow-mcp"
    echo "  $0 -p k8s -r docker.io/myuser/test-flow-mcp"
    exit 1
}

# Parse command line arguments
while getopts "p:r:t:h" opt; do
    case $opt in
        p) PROVIDER="$OPTARG" ;;
        r) REGISTRY="$OPTARG" ;;
        t) IMAGE_TAG="$OPTARG" ;;
        h) usage ;;
        *) usage ;;
    esac
done

# Validate required arguments
if [ -z "$PROVIDER" ] || [ -z "$REGISTRY" ]; then
    print_color $RED "Error: Provider and registry are required"
    usage
fi

# Build the Docker image
print_color $YELLOW "Building Docker image..."
cd "$(dirname "$0")/../.."
docker build -f mcp-server/Dockerfile -t test-flow-mcp-server:$IMAGE_TAG .

# Tag the image for the registry
print_color $YELLOW "Tagging image for registry..."
docker tag test-flow-mcp-server:$IMAGE_TAG $REGISTRY:$IMAGE_TAG

# Push the image to the registry
print_color $YELLOW "Pushing image to registry..."
docker push $REGISTRY:$IMAGE_TAG

# Deploy based on provider
case $PROVIDER in
    aws)
        print_color $YELLOW "Deploying to AWS ECS..."
        # Update task definition with the new image
        sed -i.bak "s|YOUR_ECR_REPO_URL|$REGISTRY|g" mcp-server/deploy/aws-ecs-task-definition.json
        
        # Register task definition
        aws ecs register-task-definition --cli-input-json file://mcp-server/deploy/aws-ecs-task-definition.json
        
        # Update service (assuming service already exists)
        aws ecs update-service --cluster test-flow-cluster --service test-flow-mcp-server --task-definition test-flow-mcp-server
        
        print_color $GREEN "Deployment to AWS ECS completed!"
        ;;
        
    gcp)
        print_color $YELLOW "Deploying to Google Cloud Run..."
        # Update the image in the yaml
        sed -i.bak "s|gcr.io/YOUR_PROJECT_ID/test-flow-mcp-server|$REGISTRY|g" mcp-server/deploy/google-cloud-run.yaml
        
        # Deploy to Cloud Run
        gcloud run services replace mcp-server/deploy/google-cloud-run.yaml --region=us-central1
        
        print_color $GREEN "Deployment to Google Cloud Run completed!"
        ;;
        
    azure)
        print_color $YELLOW "Deploying to Azure Container Instances..."
        # Update the image in the yaml
        sed -i.bak "s|YOUR_ACR_NAME.azurecr.io/test-flow-mcp-server|$REGISTRY|g" mcp-server/deploy/azure-container-instance.yaml
        
        # Deploy to Azure
        az container create --resource-group test-flow-rg --file mcp-server/deploy/azure-container-instance.yaml
        
        print_color $GREEN "Deployment to Azure Container Instances completed!"
        ;;
        
    k8s)
        print_color $YELLOW "Deploying to Kubernetes..."
        # Update the image in the yaml
        sed -i.bak "s|YOUR_REGISTRY/test-flow-mcp-server|$REGISTRY|g" mcp-server/deploy/kubernetes-deployment.yaml
        
        # Apply the configuration
        kubectl apply -f mcp-server/deploy/kubernetes-deployment.yaml
        
        # Wait for deployment to be ready
        kubectl rollout status deployment/test-flow-mcp-server
        
        print_color $GREEN "Deployment to Kubernetes completed!"
        ;;
        
    *)
        print_color $RED "Error: Unknown provider '$PROVIDER'"
        usage
        ;;
esac

# Restore original deployment files
find mcp-server/deploy -name "*.bak" -delete

print_color $GREEN "Deployment completed successfully!"