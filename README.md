# Test Flow Suite

A web-based test suite that enables users to create visual test flows and execute them.

## Features

- Visual flow editor with drag-and-drop interface
- Multiple test step types:
  - HTTP requests
  - Browser automation
  - Assertions
  - Delays
  - Conditional logic
- Real-time test execution monitoring
- Test results visualization

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development servers:
```bash
npm run dev
```

This will start:
- Backend server on http://localhost:3001
- Frontend on http://localhost:3000

## Architecture

- **Frontend**: React with Material-UI and React Flow for visual editing
- **Backend**: Express.js with Socket.io for real-time updates
- **Shared**: TypeScript types shared between frontend and backend
- **Test Execution**: Supports HTTP requests (axios) and browser automation (Playwright)

## Usage

1. Navigate to the Dashboard to see all test flows
2. Click the + button to create a new flow
3. Drag step types from the left panel to build your test flow
4. Connect steps to define execution order
5. Configure each step with appropriate settings
6. Save the flow
7. Run the flow from the Dashboard
8. Monitor execution in real-time on the Test Runs page