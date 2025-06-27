# Contributing to Test Flow Suite

Thank you for your interest in contributing to Test Flow Suite! This document provides comprehensive guidelines for contributing to this project.

## Quick Start

**Want to contribute right away? Here's the fastest path:**

```bash
# 1. Fork & clone the repo
git clone https://github.com/your-username/test-flow-suite.git
cd test-flow-suite

# 2. Install dependencies
make install

# 3. Start development environment
make dev

# 4. Create a feature branch
git checkout -b feat/your-feature-name

# 5. Make changes, test, and commit
git add .
git commit -m "feat: add your amazing feature"

# 6. Open a pull request
gh pr create --title "feat: add your amazing feature"
```

**New to the project?** Read the [Getting Started](#getting-started) section below for detailed setup instructions.

## Table of Contents

- [Quick Start](#quick-start)
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Architecture](#project-architecture)
- [Contributing Workflow](#contributing-workflow)
- [Branch Naming Guidelines](#branch-naming-guidelines)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Security Vulnerabilities](#security-vulnerabilities)
- [What NOT to Do](#what-not-to-do)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. Be professional, constructive, and considerate in all interactions.

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- MongoDB (optional, defaults to SQLite)
- Docker (optional, for MongoDB)

### First Time Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/test-flow-suite.git
   cd test-flow-suite
   ```
3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/original-repo/test-flow-suite.git
   ```
4. Install dependencies:
   ```bash
   make install
   # or
   npm install
   ```

## Development Setup

### Quick Start (Recommended)
```bash
make dev          # Start with MongoDB
make dev-sqlite   # Start with SQLite (fallback)
```

### Manual Setup
```bash
npm run dev       # SQLite backend
npm run dev:mongo # MongoDB backend
```

This starts:
- Backend server on http://localhost:3001
- Frontend on http://localhost:3000

### Database Options
- **SQLite** (default): Automatically creates `backend/data/flows.db`
- **MongoDB**: Start with `make docker-up` then `make dev`

## Project Architecture

This is a monorepo with three main packages:

- `/backend` - Express.js API with Socket.io
- `/frontend` - React SPA with Material-UI and react-flow-renderer  
- `/shared` - TypeScript types shared between packages

### Key Components
- **Services**: Dependency-injected services for data management
- **Real-time Updates**: Socket.io for live test execution monitoring
- **Visual Editor**: React Flow for drag-and-drop test creation
- **Test Execution**: Supports HTTP requests and browser automation

## Contributing Workflow

1. **Check existing issues** before starting work
2. **Create an issue** for new features or significant changes
3. **Fork and branch** from `main`
4. **Make your changes** following our guidelines
5. **Test thoroughly** including edge cases
6. **Submit a pull request** with clear description

### Staying Updated
```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

## Branch Naming Guidelines

Use descriptive branch names with the following prefixes:

### Prefixes
- `feat/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests
- `chore/` - Maintenance tasks
- `hotfix/` - Critical production fixes

### Examples
```
feat/add-mongodb-support
fix/flow-editor-connection-bug
docs/update-api-documentation
refactor/extract-test-runner-service
test/add-curl-parser-tests
chore/update-dependencies
hotfix/critical-security-patch
```

### Branch Naming Rules
- Use lowercase with hyphens
- Be descriptive but concise
- Include issue number when applicable: `feat/123-add-user-auth`
- Avoid generic names like `fix-bug` or `update`

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, missing semicolons, etc.)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks
- `perf` - Performance improvements
- `ci` - CI/CD changes

### Examples
```
feat(api): add MongoDB support for flow persistence

fix(frontend): resolve flow editor connection rendering issue

docs: update README with new setup instructions

refactor(backend): extract test runner into separate service

test(utils): add comprehensive tests for curl parser

chore(deps): update TypeScript to 5.0
```

### Commit Message Rules
- Use present tense ("add feature" not "added feature")
- Use imperative mood ("move cursor to..." not "moves cursor to...")
- Limit first line to 72 characters
- Reference issues and pull requests when applicable
- Include breaking change notes in footer when applicable

### Breaking Changes
```
feat(api): change flow execution response format

BREAKING CHANGE: Flow execution now returns detailed step results
instead of simple success/failure status.
```

## Code Style Guidelines

### TypeScript/JavaScript

**✅ Good Examples:**
```typescript
// Use meaningful names and const
const testExecutionTimeout = 5000;
const activeFlowSteps = flow.steps.filter(step => step.enabled);

// Prefer async/await
async function executeTestFlow(flowId: string): Promise<TestResult> {
  try {
    const flow = await flowStore.getFlow(flowId);
    const result = await testRunner.execute(flow);
    return result;
  } catch (error) {
    logger.error('Flow execution failed:', error);
    throw new FlowExecutionError(`Failed to execute flow ${flowId}`);
  }
}
```

**❌ Bad Examples:**
```typescript
// Avoid vague names and var
var t = 5000;
let data = flow.steps.filter(s => s.e);

// Avoid Promise chains when async/await is clearer
function executeTestFlow(flowId: string): Promise<TestResult> {
  return flowStore.getFlow(flowId)
    .then(flow => testRunner.execute(flow))
    .then(result => result)
    .catch(error => {
      throw error;
    });
}
```

### React Components

**✅ Good Examples:**
```typescript
// Functional component with proper TypeScript
import React, { useState, useEffect } from 'react';
import { FlowType } from '../../shared/src/types';

interface FlowEditorProps {
  flowId: string;
  onSave: (flow: FlowType) => void;
  readonly?: boolean;
}

export function FlowEditor({ flowId, onSave, readonly = false }: FlowEditorProps) {
  const [flow, setFlow] = useState<FlowType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFlow();
  }, [flowId]);

  const loadFlow = async () => {
    try {
      setLoading(true);
      const loadedFlow = await api.getFlow(flowId);
      setFlow(loadedFlow);
    } catch (error) {
      console.error('Failed to load flow:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!flow) return <div>Flow not found</div>;

  return (
    <div className="flow-editor">
      {/* Component content */}
    </div>
  );
}
```

**❌ Bad Examples:**
```typescript
// Class component (avoid for new code)
class FlowEditor extends React.Component<any, any> {
  // Implementation...
}

// Missing TypeScript interfaces
export default function FlowEditor(props) {
  // No type safety
}
```

### Backend Services

**✅ Good Examples:**
```typescript
// Service with dependency injection and proper interfaces
export interface ITestRunner {
  execute(flow: FlowType): Promise<TestResult>;
  stop(executionId: string): Promise<void>;
}

export class TestRunner implements ITestRunner {
  constructor(
    private flowStore: IFlowStore,
    private logger: ILogger,
    private socketEmitter: ISocketEmitter
  ) {}

  async execute(flow: FlowType): Promise<TestResult> {
    const executionId = generateId();
    
    try {
      this.logger.info(`Starting flow execution: ${flow.id}`);
      this.socketEmitter.emit('test-started', { flowId: flow.id, executionId });
      
      const result = await this.executeSteps(flow.steps);
      
      this.socketEmitter.emit('test-completed', { 
        flowId: flow.id, 
        executionId, 
        result 
      });
      
      return result;
    } catch (error) {
      this.logger.error(`Flow execution failed: ${flow.id}`, error);
      this.socketEmitter.emit('test-failed', { 
        flowId: flow.id, 
        executionId, 
        error: error.message 
      });
      throw new TestExecutionError(`Flow ${flow.id} execution failed: ${error.message}`);
    }
  }
}
```

**❌ Bad Examples:**
```typescript
// No dependency injection, hard-coded dependencies
export class TestRunner {
  async execute(flow: any) {
    // Direct database access (should use injected store)
    const db = getDatabase();
    
    // No error handling
    const result = await this.runSteps(flow.steps);
    return result;
  }
}
```

### API Routes

**✅ Good Examples:**
```typescript
// RESTful routes with proper error handling
export function createFlowRoutes(flowStore: IFlowStore): Router {
  const router = Router();

  router.get('/flows/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!isValidUUID(id)) {
        return res.status(400).json({ 
          error: 'Invalid flow ID format' 
        });
      }

      const flow = await flowStore.getFlow(id);
      
      if (!flow) {
        return res.status(404).json({ 
          error: 'Flow not found' 
        });
      }

      res.json(flow);
    } catch (error) {
      logger.error('Failed to get flow:', error);
      res.status(500).json({ 
        error: 'Internal server error' 
      });
    }
  });

  return router;
}
```

### File Organization & Imports

**✅ Good Example:**
```typescript
// External libraries first
import express, { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Shared types
import { FlowType, TestResult } from '../../shared/src/types';

// Local services (by dependency hierarchy)
import { IFlowStore } from '../services/FlowStore';
import { ITestRunner } from '../services/TestRunner';
import { logger } from '../utils/logger';
import { validateFlow, isValidUUID } from '../utils/validation';
```

**❌ Bad Example:**
```typescript
// Mixed import order
import { validateFlow } from '../utils/validation';
import express from 'express';
import { FlowType } from '../../shared/src/types';
import { logger } from '../utils/logger';
import { IFlowStore } from '../services/FlowStore';
```

### Naming Conventions

**✅ Good Examples:**
```typescript
// Components: PascalCase
export function FlowEditor() {}
export function StepConfigPanel() {}

// Functions & variables: camelCase
const executeTestFlow = async () => {};
const testExecutionResults = [];

// Constants: SCREAMING_SNAKE_CASE
const DEFAULT_TIMEOUT = 5000;
const MAX_RETRY_COUNT = 3;

// Types & Interfaces: PascalCase with 'I' prefix for interfaces
interface IFlowStore {}
type FlowExecutionStatus = 'pending' | 'running' | 'completed' | 'failed';

// Files: kebab-case or camelCase (be consistent within directories)
// flow-editor.tsx, stepConfigPanel.tsx
```

## Testing Guidelines

### Testing Framework Setup

The project uses different testing frameworks for frontend and backend:

**Frontend (Vitest + React Testing Library):**
```bash
npm run test:frontend        # Run tests in watch mode
npm run test:run             # Run tests once
npm run test:coverage        # Run with coverage
```

**Backend (Jest + Supertest):**
```bash
npm run test:backend         # Run tests
npm run test:watch           # Run in watch mode  
npm run test:coverage        # Run with coverage
```

**All Tests:**
```bash
make test                    # Run all tests
make test-coverage           # Run with coverage
```

### Writing Tests

**Frontend Component Tests:**
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { FlowEditor } from '../FlowEditor';

describe('FlowEditor', () => {
  it('should render flow editor', () => {
    render(<FlowEditor flowId="123" onSave={vi.fn()} />);
    expect(screen.getByText('Flow Editor')).toBeInTheDocument();
  });
});
```

**Backend Service Tests:**
```typescript
import { TestRunner } from '../TestRunner';

describe('TestRunner', () => {
  it('should execute flow successfully', async () => {
    const testRunner = new TestRunner(mockFlowStore, mockLogger, mockSocket);
    const result = await testRunner.execute(mockFlow);
    expect(result.success).toBe(true);
  });
});
```

**API Route Tests:**
```typescript
import request from 'supertest';
import { app } from '../app';

describe('Flow API', () => {
  it('should get flow by id', async () => {
    const response = await request(app)
      .get('/api/flows/123')
      .expect(200);
    
    expect(response.body.id).toBe('123');
  });
});
```

### Testing Best Practices

- **Unit Tests**: Test individual functions and components in isolation
- **Integration Tests**: Test API endpoints and service interactions
- **Mocking**: Mock external dependencies (database, socket.io, etc.)
- **Coverage**: Aim for >80% code coverage on new code
- **Test Structure**: Use `describe/it` blocks with clear, descriptive names

### Testing Checklist
- [ ] Write unit tests for new utility functions
- [ ] Add component tests for new React components
- [ ] Test API endpoints with various inputs and edge cases
- [ ] Mock external dependencies properly
- [ ] Test both happy path and error scenarios
- [ ] Verify TypeScript compilation in tests
- [ ] Run tests locally before submitting PR
- [ ] Check test coverage reports

### Manual Testing Checklist
- [ ] Test with both SQLite and MongoDB backends
- [ ] Test real-time updates via Socket.io
- [ ] Test frontend UI interactions across browsers
- [ ] Verify no console errors or warnings
- [ ] Test import/export functionality
- [ ] Check responsive design on different screen sizes

## Pull Request Process

### Before Submitting
1. Ensure your branch is up to date with `main`
2. Run the application and test your changes thoroughly
3. Check for TypeScript compilation errors
4. Verify no console errors in browser
5. Test with both database backends if applicable

### PR Title Format
Use the same format as commit messages:
```
feat(frontend): add dark mode toggle to settings
fix(api): resolve MongoDB connection timeout issue
```

### PR Description Template
```markdown
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Manual testing completed
- [ ] Tested with SQLite backend
- [ ] Tested with MongoDB backend (if applicable)
- [ ] No console errors or warnings
- [ ] Real-time features working correctly

## Screenshots (if applicable)
Add screenshots for UI changes.

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] No sensitive information included
- [ ] Documentation updated (if needed)
```

### Review Process
1. Automated checks must pass
2. At least one maintainer review required
3. Address all review feedback
4. Maintain clean commit history
5. Squash related commits if requested

## Issue Reporting

### Bug Reports
Include:
- Clear, descriptive title
- Steps to reproduce
- Expected vs actual behavior
- Browser/OS information
- Console errors or logs
- Screenshots if applicable

### Feature Requests
Include:
- Clear description of the feature
- Use case and motivation
- Proposed implementation approach
- Alternative solutions considered

### Issue Labels
- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Documentation improvements
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `question` - Further information requested

## Security Vulnerabilities

**DO NOT** open public issues for security vulnerabilities. Instead:
1. Email security concerns privately to maintainers
2. Provide detailed description and reproduction steps
3. Allow reasonable time for response before public disclosure

## What NOT to Do

### Code
- ❌ Don't add dependencies without discussion
- ❌ Don't commit secrets, API keys, or sensitive data
- ❌ Don't bypass TypeScript checks with `any` types
- ❌ Don't commit commented-out code
- ❌ Don't make breaking changes without discussion
- ❌ Don't copy code without understanding licensing

### Git
- ❌ Don't commit directly to `main` branch
- ❌ Don't force push to shared branches
- ❌ Don't commit large binary files
- ❌ Don't rewrite public commit history
- ❌ Don't use vague commit messages

### Pull Requests
- ❌ Don't submit PRs with unrelated changes
- ❌ Don't ignore review feedback
- ❌ Don't submit untested changes
- ❌ Don't create PRs for minor formatting changes
- ❌ Don't bypass the review process

### Issues
- ❌ Don't duplicate existing issues
- ❌ Don't use issues for support questions
- ❌ Don't be demanding or disrespectful
- ❌ Don't provide incomplete information

## Getting Help

- Check existing issues and documentation first
- Ask questions in issue comments
- Be specific about what you're trying to achieve
- Provide context and relevant code snippets

## Recognition

Contributors are recognized through:
- Git commit history
- Contributors section in README
- Release notes acknowledgments

Thank you for contributing to Test Flow Suite!