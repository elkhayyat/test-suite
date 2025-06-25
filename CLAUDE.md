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
- `cd backend && npm run dev` - Run backend only with hot reload
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

1. **Entry Point**: `backend/src/index.ts` - Sets up Express, Socket.io, and injects services into routes
2. **Services**:
   - `FlowStore` - Manages test flows with in-memory cache and SQLite persistence
   - `TestRunner` - Executes test flows, handles Playwright/axios, emits real-time updates
3. **Database**: SQLite with singleton pattern at `backend/src/db/database.ts`
4. **Routes**: Factory pattern for dependency injection (e.g., `flowRoutes(flowStore)`)

### Frontend Architecture
1. **Main Components**:
   - `Dashboard` - Flow management interface
   - `FlowEditor` - Visual flow builder using react-flow-renderer
   - `TestRuns` - Real-time execution monitoring
2. **Custom Hooks**: `useSocket` for WebSocket connection
3. **API Layer**: `frontend/src/services/api.ts` for backend communication

### Test Step Types
- HTTP requests (via axios)
- Browser automation (via Playwright)
- Assertions
- Delays
- Conditional logic

### Real-time Updates
Socket.io events are emitted during test execution for live status updates.

## Key Files to Understand

1. `shared/src/types.ts` - All TypeScript interfaces for the domain model
2. `backend/src/services/TestRunner.ts` - Test execution logic with topological sorting
3. `frontend/src/pages/FlowEditor.tsx` - Visual flow editing implementation
4. `backend/src/services/FlowStore.ts` - Flow persistence and caching logic

## Database

SQLite database at `backend/data/flows.db` stores test flows. The schema is auto-created on first run.

## Known Issues (from TODO.md)
- Nothing happens when clicking "show test runs"
- Step ID is not visible in the UI

## Future Features Planned
- Multiple environments support
- Multiple projects support
- Multiple users support
- Folders within projects