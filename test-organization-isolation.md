# Test Organization Isolation

This document demonstrates how the multi-tenant organization isolation works in the Test Flow Suite.

## Key Features Implemented

### 1. **Environment Isolation**
- Each organization has its own environments
- Environment names are unique per organization (not globally)
- Users can only see/manage environments from their organization

### 2. **Test Run Isolation**
- Test runs now include `organizationId` and `userId` fields
- `/api/runs` endpoint filters runs by the user's organization
- Users cannot access test runs from other organizations

### 3. **Project and Flow Isolation**
- Projects belong to organizations
- Flows belong to projects (and inherit organization)
- All endpoints enforce organization access control

### 4. **User's Active Environment**
- Users have an `activeEnvironmentId` field that persists
- Environment selection is saved to the user profile
- Frontend automatically loads user's active environment

## Database Schema Changes

```typescript
// Updated models with organization support
export interface Environment {
  id: string;
  organizationId: string;  // NEW
  name: string;
  // ...
}

export interface TestRun {
  id: string;
  flowId: string;
  organizationId: string;  // NEW
  userId: string;         // NEW
  // ...
}

export interface User {
  id: string;
  email: string;
  organizationId?: string;
  activeEnvironmentId?: string;  // NEW
  // ...
}
```

## API Security

All protected endpoints now:
1. Require authentication (JWT token)
2. Filter data by organization
3. Return 403 for cross-organization access attempts

## Testing the Isolation

1. **Create two organizations:**
   ```bash
   # User 1 with Org 1
   curl -X POST /api/auth/register -d '{
     "email": "user1@example.com",
     "password": "password",
     "organizationName": "Org 1"
   }'
   
   # User 2 with Org 2
   curl -X POST /api/auth/register -d '{
     "email": "user2@example.com", 
     "password": "password",
     "organizationName": "Org 2"
   }'
   ```

2. **Each organization can have environments with same names:**
   - Org 1 can have "Production", "Staging", "Sandbox"
   - Org 2 can have "Production", "Staging", "Sandbox"
   - No conflicts!

3. **Test runs are isolated:**
   - User 1 sees only Org 1's test runs
   - User 2 sees only Org 2's test runs

## Benefits

- **Complete data isolation** between organizations
- **Scalable multi-tenant architecture**
- **Secure by default** - all endpoints check organization access
- **Flexible** - organizations can have same resource names without conflicts