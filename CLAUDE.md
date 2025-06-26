# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Test Flow Suite is a web-based test automation platform with visual flow editing capabilities. It consists of a React frontend, Express.js backend, and shared TypeScript types in a monorepo structure using npm workspaces.

## Commands

### Development
- `npm install` - Install all dependencies for the monorepo
- `npm run dev` - Start both frontend (port 3000) and backend (port 3001) in development mode
- `npm run build` - Build all packages

### Backend-specific
- `cd backend && npm run dev` - Run backend only with hot reload (SQLite)
- `cd backend && npm run dev:mongo` - Run backend with MongoDB
- `cd backend && npm run build` - Compile TypeScript
- `cd backend && npm start` - Run production server

### Frontend-specific
- `cd frontend && npm run dev` - Run frontend dev server
- `cd frontend && npm run build` - Build production bundle
- `cd frontend && npm run preview` - Preview production build

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

- `.env.example` - Template for environment configuration
- MongoDB connection: `MONGODB_URI` (defaults to `mongodb://localhost:27017/testflowsuite`)

## Known Issues (from TODO.md)
- Can't run single or selected steps from flow editor
- Add run button to step right click menu to run this step

## Migration Notes
See `MONGODB_MIGRATION.md` for instructions on switching from SQLite to MongoDB.