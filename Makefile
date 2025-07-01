# Test Flow Suite - Makefile

.PHONY: help install dev stop clean logs build start docker-up docker-down docker-logs test test-frontend test-backend test-coverage

# Default target
help:
	@echo "Test Flow Suite - Available Commands:"
	@echo ""
	@echo "  Setup & Installation:"
	@echo "    make install          - Install all dependencies"
	@echo ""
	@echo "  Development:"
	@echo "    make dev              - Start everything (MongoDB + Backend + Frontend)"
	@echo ""
	@echo "  Docker & Database:"
	@echo "    make docker-up        - Start MongoDB with Docker Compose"
	@echo "    make docker-down      - Stop MongoDB containers"
	@echo "    make docker-logs      - View MongoDB container logs"
	@echo ""
	@echo "  Production:"
	@echo "    make build            - Build all packages"
	@echo "    make start            - Start production server (MongoDB)"
	@echo ""
	@echo "  Testing:"
	@echo "    make test             - Run all tests"
	@echo "    make test-frontend    - Run frontend tests only"
	@echo "    make test-backend     - Run backend tests only"
	@echo "    make test-coverage    - Run tests with coverage report"
	@echo ""
	@echo "  Utilities:"
	@echo "    make stop             - Stop all running processes"
	@echo "    make clean            - Clean build artifacts and node_modules"
	@echo "    make logs             - Show application logs"

# Install dependencies
install:
	@echo "Installing dependencies..."
	npm install

# Start everything with MongoDB
dev: docker-up
	@echo "Starting Test Flow Suite with MongoDB..."
	@echo "MongoDB: http://localhost:8081 (admin/admin123)"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend: http://localhost:3001"
	@echo ""
	@sleep 3
	npm run dev

# Docker commands
docker-up:
	@echo "Starting MongoDB with Docker..."
	docker compose up -d mongodb
	@echo "Waiting for MongoDB to be ready..."
	@sleep 5

docker-down:
	@echo "Stopping Docker containers..."
	docker compose down

docker-logs:
	@echo "Showing MongoDB logs..."
	docker compose logs -f mongodb

# Production builds
build:
	@echo "Building all packages..."
	npm run build

start: build docker-up
	@echo "Starting production server with MongoDB..."
	npm run start

# Utility commands
stop:
	@echo "Stopping all processes..."
	@pkill -f "tsx watch" || true
	@pkill -f "vite" || true
	@pkill -f "node.*index" || true
	@echo "Stopped development servers"

clean:
	@echo "Cleaning build artifacts..."
	rm -rf backend/dist
	rm -rf frontend/dist
	rm -rf backend/node_modules
	rm -rf frontend/node_modules
	rm -rf shared/node_modules
	rm -rf node_modules
	@echo "Clean complete"

logs:
	@echo "Application logs:"
	@echo "Check terminal output or use 'make docker-logs' for MongoDB logs"

# Testing commands
test:
	@echo "Running all tests..."
	npm run test

test-frontend:
	@echo "Running frontend tests..."
	npm run test:frontend

test-backend:
	@echo "Running backend tests..."
	npm run test:backend

test-coverage:
	@echo "Running tests with coverage..."
	npm run test:coverage

# Quick restart
restart: stop dev

# Show status
status:
	@echo "Checking service status..."
	@echo ""
	@echo "Docker containers:"
	@docker compose ps || echo "Docker not running"
	@echo ""
	@echo "Node processes:"
	@pgrep -l "node\|tsx" || echo "No Node.js processes running"