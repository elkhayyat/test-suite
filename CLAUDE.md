# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Test Flow Suite is a web-based test automation platform with visual flow editing capabilities. It consists of a React frontend, Express.js backend, and shared TypeScript types in a monorepo structure using npm workspaces.

## Commands

### Quick Start (Recommended)
- `make install` - Install all dependencies for the monorepo
- `make dev` - Start everything with MongoDB (recommended setup)
- `make dev-sqlite` - Start with SQLite backend (fallback option)

### Development
- `npm install` - Install all dependencies for the monorepo
- `npm run dev` - Start both frontend (port 3000) and backend (port 3001) in development mode (SQLite)
- `npm run dev:mongo` - Start with MongoDB backend
- `npm run build` - Build all packages

### Backend-specific
- `cd backend && npm run dev` - Run backend only with hot reload (SQLite)
- `cd backend && npm run dev:mongo` - Run backend with MongoDB
- `cd backend && npm run build` - Compile TypeScript
- `cd backend && npm start` - Run production server

### Frontend-specific
- `cd frontend && npm run dev` - Run frontend dev server
- `cd frontend && npm run build` - Build TypeScript and create production bundle
- `cd frontend && npm run preview` - Preview production build

### Docker & Database
- `make docker-up` - Start MongoDB with Docker Compose
- `make docker-down` - Stop MongoDB containers
- `make docker-logs` - View MongoDB container logs

### Production
- `make build` - Build all packages
- `make start` - Start production server (SQLite)
- `make start-mongo` - Start production server (MongoDB)

### Testing
- No formal test suite setup currently
- `frontend/src/utils/curlParser.test.ts` - Manual curl parser tests (browser console)

### Utilities
- `make stop` - Stop all running development processes
- `make clean` - Clean build artifacts and node_modules
- `make status` - Check service status

## Architecture

### Monorepo Structure
- `/backend` - Express.js API with Socket.io for real-time updates
- `/frontend` - React SPA with Material-UI and react-flow-renderer
- `/shared` - TypeScript type definitions shared between packages

### Backend Architecture
The backend uses dependency injection and service-oriented architecture:

1. **Entry Points**: 
   - `backend/src/index.ts` - SQLite version
   - `backend/src/index-mongo.ts` - MongoDB version
2. **Services**:
   - `FlowStore` / `FlowStoreMongo` - Manages test flows with in-memory cache and persistence
   - `ProjectStore` / `ProjectStoreMongo` - Manages projects and folders
   - `EnvironmentStore` / `EnvironmentStoreMongo` - Manages environments and variables
   - `TestRunner` - Executes test flows, handles Playwright/axios, emits real-time updates
3. **Database**: 
   - SQLite with singleton pattern at `backend/src/db/database.ts`
   - MongoDB with connection at `backend/src/db/mongodb.ts`
4. **Routes**: Factory pattern for dependency injection (e.g., `flowRoutes(flowStore)`)

### Frontend Architecture
1. **Main Pages**:
   - `Dashboard` - Flow management interface with search and filtering
   - `FlowEditor` - Visual flow builder using react-flow-renderer
   - `Projects` - Project and folder management
   - `TestRunDetails` - Real-time execution monitoring
   - `FlowsOrganizer` - Drag-and-drop flow organization
2. **Key Components**:
   - `FlowTree` - Hierarchical flow display with context menus
   - `StepNode` - Custom node for flow editor
   - `VariablesDialog` - Environment variable management
3. **Custom Hooks**: `useSocket` for WebSocket connection
4. **API Layer**: `frontend/src/services/api.ts` for backend communication

### Test Step Types
- HTTP requests (via axios)
- Browser automation (via Playwright)
- Assertions
- Delays
- Conditional logic

### Real-time Updates
Socket.io events are emitted during test execution for live status updates in the UI.

## Key Files to Understand

1. `shared/src/types.ts` - All TypeScript interfaces for the domain model
2. `backend/src/services/TestRunner.ts` - Test execution logic with topological sorting
3. `frontend/src/pages/FlowEditor.tsx` - Visual flow editing implementation
4. `backend/src/services/FlowStore*.ts` - Flow persistence and caching logic
5. `frontend/src/components/FlowTree.tsx` - Project/folder/flow hierarchy component

## Database

### SQLite (Default)
Database at `backend/data/flows.db` stores test flows. The schema is auto-created on first run.

### MongoDB (Optional)
Can be started with Docker Compose. Collections include flows, environments, projects, folders with JSON schema validation.

## Environment Variables

Copy `.env.example` to `.env` and configure as needed:

- `MONGODB_URL` - MongoDB connection string (defaults to `mongodb://app_user:app_password@localhost:27017/test-flow-suite`)
- `MONGODB_DB_NAME` - Database name (defaults to `test-flow-suite`)
- `PORT` - Backend server port (defaults to `3001`)
- `FRONTEND_URL` - Frontend URL for CORS configuration (defaults to `http://localhost:3000`)

### Docker Setup

MongoDB is configured with Docker Compose:
- MongoDB admin credentials: `admin/admin123`
- Mongo Express web UI: `http://localhost:8081` (admin/admin123)
- Database user credentials are auto-created via `init-mongo.js`

## Known Issues (from TODO.md)

### Active Bugs
- Running a single step clears all other steps status

### Pending Features
- Add ability to import OpenAPI schema and generate requests
- Add ability to run a full folder or project flows in the dashboard page
- Move sidebar navigation items into the header
- Add project/folders/flows explorer into the sidebar
- Add ability to add a flow into specific folder or specific project
- Add right click menu to file explorer for project/folder/flow operations

## Development Patterns

### Variable Interpolation
- `EnhancedInterpolator` service handles variable resolution in test steps
- Random value generation utilities in `randomGenerators.ts` for both frontend and backend
- Environment variables are resolved at runtime during test execution

### Curl Command Support
- Curl parser utility converts curl commands to HTTP step configurations
- Located in `frontend/src/utils/curlParser.ts` with basic tests
- Supports headers, authentication, and request body parsing

### Real-time Updates
- Socket.io integration provides live test execution feedback
- `TestRunner` service emits events during test execution
- `useSocket` hook manages WebSocket connections in frontend

### Service Architecture
- Dependency injection pattern used throughout backend
- Store services (FlowStore, ProjectStore, EnvironmentStore) provide data persistence abstraction
- Both SQLite and MongoDB implementations available for each store

## Migration Notes
See `docs/MONGODB_MIGRATION.md` for instructions on switching from SQLite to MongoDB.