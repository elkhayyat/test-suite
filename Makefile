# Test Flow Suite - Makefile

.PHONY: help install dev dev-mongo dev-sqlite stop clean logs build start start-mongo docker-up docker-down docker-logs

# Default target
help:
	@echo "Test Flow Suite - Available Commands:"
	@echo ""
	@echo "  Setup & Installation:"
	@echo "    make install          - Install all dependencies"
	@echo ""
	@echo "  Development (MongoDB):"
	@echo "    make dev              - Start everything (MongoDB + Backend + Frontend)"
	@echo "    make dev-mongo        - Same as 'make dev' (alias)"
	@echo ""
	@echo "  Development (SQLite):"
	@echo "    make dev-sqlite       - Start with SQLite backend + Frontend"
	@echo ""
	@echo "  Docker & Database:"
	@echo "    make docker-up        - Start MongoDB with Docker Compose"
	@echo "    make docker-down      - Stop MongoDB containers"
	@echo "    make docker-logs      - View MongoDB container logs"
	@echo ""
	@echo "  Production:"
	@echo "    make build            - Build all packages"
	@echo "    make start            - Start production server (SQLite)"
	@echo "    make start-mongo      - Start production server (MongoDB)"
	@echo ""
	@echo "  Utilities:"
	@echo "    make stop             - Stop all running processes"
	@echo "    make clean            - Clean build artifacts and node_modules"
	@echo "    make logs             - Show application logs"

# Install dependencies
install:
	@echo "Installing dependencies..."
	npm install

# Start everything with MongoDB (recommended)
dev: docker-up
	@echo "Starting Test Flow Suite with MongoDB..."
	@echo "MongoDB: http://localhost:8081 (admin/admin123)"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend: http://localhost:3001"
	@echo ""
	@sleep 3
	npm run dev:mongo

# Alias for dev
dev-mongo: dev

# Start with SQLite (fallback)
dev-sqlite:
	@echo "Starting Test Flow Suite with SQLite..."
	@echo "Frontend: http://localhost:3000"
	@echo "Backend: http://localhost:3001"
	@echo ""
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

start: build
	@echo "Starting production server with SQLite..."
	npm run start

start-mongo: build docker-up
	@echo "Starting production server with MongoDB..."
	npm run start:mongo

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