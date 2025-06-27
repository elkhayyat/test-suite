# Contributing to Test Flow Suite

Thank you for your interest in contributing to Test Flow Suite! This document provides comprehensive guidelines for contributing to this project.

## Table of Contents

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
- Use TypeScript for all new code
- Follow existing code patterns and conventions
- Use meaningful variable and function names
- Prefer `const` over `let`, avoid `var`
- Use async/await over Promises when possible

### React Components
- Use functional components with hooks
- Follow existing component structure patterns
- Use TypeScript interfaces for props
- Prefer named exports over default exports
- Keep components focused and single-purpose

### Backend Services
- Follow dependency injection patterns
- Use TypeScript interfaces for service contracts
- Implement proper error handling
- Add appropriate logging
- Follow RESTful API conventions

### File Organization
- Group related functionality together
- Use clear, descriptive file names
- Follow existing directory structure
- Keep files focused and not overly large

### Imports
```typescript
// External libraries first
import React from 'react';
import express from 'express';

// Internal imports by hierarchy
import { FlowType } from '../../shared/src/types';
import { TestRunner } from '../services/TestRunner';
import { validateFlow } from '../utils/validation';
```

## Testing Guidelines

### Current State
- No formal test suite setup currently
- Manual testing required for all changes
- Consider adding tests for new functionality

### Testing Checklist
- [ ] Test happy path scenarios
- [ ] Test error conditions and edge cases
- [ ] Test with both SQLite and MongoDB backends
- [ ] Test real-time updates via Socket.io
- [ ] Test frontend UI interactions
- [ ] Test API endpoints with various inputs
- [ ] Verify no console errors or warnings

### Manual Testing
1. Start development environment
2. Create and run test flows
3. Verify all step types work correctly
4. Test import/export functionality
5. Check real-time execution monitoring
6. Test project/folder organization

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