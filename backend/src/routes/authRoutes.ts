import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthService } from '../services/AuthService';
import { UserStoreMongo } from '../services/UserStoreMongo';
import { OrganizationStoreMongo } from '../services/OrganizationStoreMongo';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { authConfig } from '../config/auth';
import { RegisterRequest, LoginRequest } from '../../../shared/src/types';
import { v4 as uuidv4 } from 'uuid';

export const authRoutes = (
  authService: AuthService,
  userStore: UserStoreMongo,
  organizationStore: OrganizationStoreMongo
) => {
  const router = Router();

  // Register endpoint
  router.post(
    '/register',
    [
      body('email').isEmail().normalizeEmail(),
      body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
      body('name').trim().notEmpty(),
      body('organizationName').optional().trim(),
    ],
    async (req: Request<{}, {}, RegisterRequest>, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { email, password, name, organizationName } = req.body;

        // Check if user already exists
        const existingUser = await userStore.getUserByEmail(email);
        if (existingUser) {
          return res.status(409).json({ error: 'User already exists' });
        }

        // Create organization if organizationName is provided
        let organizationId: string;
        if (organizationName) {
          const organization = await organizationStore.createOrganization({
            name: organizationName,
          });
          organizationId = organization.id;

          // Create default team for the organization
          await organizationStore.createTeam({
            organizationId,
            name: 'Default Team',
            description: 'Default team for the organization',
          });
        } else {
          // Use default organization
          const defaultOrg = await organizationStore.getOrganizations();
          organizationId = defaultOrg[0]?.id || '';
        }

        // Hash password and create user
        const passwordHash = await authService.hashPassword(password);
        const user = await userStore.createUser({
          email,
          name,
          passwordHash,
          role: organizationName ? 'admin' : 'developer',
          organizationId,
        });

        // If created organization, add user as owner of default team
        if (organizationName) {
          const teams = await organizationStore.getTeamsByOrganization(organizationId);
          if (teams.length > 0) {
            await organizationStore.addUserToTeam(teams[0].id, user.id, 'owner');
          }
        }

        // Generate token
        const token = authService.generateToken(user);

        // Set cookie
        res.cookie(authConfig.cookieName, token, {
          httpOnly: true,
          secure: authConfig.cookieSecure,
          sameSite: authConfig.cookieSameSite,
          maxAge: authConfig.cookieMaxAge,
        });

        const organization = await organizationStore.getOrganization(organizationId);

        res.json({
          user,
          token,
          organization,
        });
      } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
      }
    }
  );

  // Login endpoint
  router.post(
    '/login',
    [
      body('email').isEmail().normalizeEmail(),
      body('password').notEmpty(),
    ],
    async (req: Request<{}, {}, LoginRequest>, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        // Get user with password
        const userWithPassword = await userStore.getUserWithPasswordByEmail(email);
        if (!userWithPassword) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isValid = await authService.comparePassword(password, userWithPassword.passwordHash);
        if (!isValid) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Get user without password
        const user = await userStore.getUserByEmail(email);
        if (!user) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = authService.generateToken(user);

        // Set cookie
        res.cookie(authConfig.cookieName, token, {
          httpOnly: true,
          secure: authConfig.cookieSecure,
          sameSite: authConfig.cookieSameSite,
          maxAge: authConfig.cookieMaxAge,
        });

        const organization = user.organizationId 
          ? await organizationStore.getOrganization(user.organizationId)
          : null;

        res.json({
          user,
          token,
          organization,
        });
      } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
      }
    }
  );

  // Logout endpoint
  router.post('/logout', (req: Request, res: Response) => {
    res.clearCookie(authConfig.cookieName);
    res.json({ message: 'Logged out successfully' });
  });

  // Get current user
  router.get('/me', authMiddleware(authService), async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await userStore.getUserById(req.user.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const organization = user.organizationId 
        ? await organizationStore.getOrganization(user.organizationId)
        : null;

      res.json({
        user,
        organization,
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Failed to get user' });
    }
  });

  // Set active environment
  router.put('/active-environment', authMiddleware(authService), async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { environmentId } = req.body;
      if (!environmentId) {
        return res.status(400).json({ error: 'environmentId is required' });
      }

      // Update user's active environment
      const updatedUser = await userStore.updateUser(req.user.userId, {
        activeEnvironmentId: environmentId
      });

      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user: updatedUser });
    } catch (error) {
      console.error('Set active environment error:', error);
      res.status(500).json({ error: 'Failed to set active environment' });
    }
  });

  // Send invitation
  router.post(
    '/invite',
    authMiddleware(authService),
    [
      body('email').isEmail().normalizeEmail(),
      body('teamId').notEmpty(),
      body('role').isIn(['admin', 'member', 'viewer']),
    ],
    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        if (!req.user) {
          return res.status(401).json({ error: 'Not authenticated' });
        }

        const { email, teamId, role } = req.body;

        // Verify user has permission to invite to this team
        const team = await organizationStore.getTeam(teamId);
        if (!team || team.organizationId !== req.user.organizationId) {
          return res.status(403).json({ error: 'Permission denied' });
        }

        // Check if user is admin or owner of the team
        const teamUsers = await organizationStore.getTeamUsers(teamId);
        const currentUserTeamRole = teamUsers.find(tu => tu.userId === req.user!.userId);
        if (!currentUserTeamRole || !['owner', 'admin'].includes(currentUserTeamRole.role)) {
          return res.status(403).json({ error: 'Only team owners and admins can invite users' });
        }

        // Generate invitation token
        const token = authService.generateInvitationToken(
          email,
          req.user.organizationId,
          teamId,
          role
        );

        // TODO: Send invitation email
        // For now, return the invitation link
        const invitationUrl = `${process.env.FRONTEND_URL}/accept-invitation?token=${token}`;

        res.json({
          id: uuidv4(),
          email,
          organizationId: req.user.organizationId,
          teamId,
          role,
          invitedBy: req.user.userId,
          invitationUrl,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          createdAt: new Date(),
        });
      } catch (error) {
        console.error('Invitation error:', error);
        res.status(500).json({ error: 'Failed to send invitation' });
      }
    }
  );

  // Accept invitation
  router.post(
    '/accept-invitation',
    [
      body('token').notEmpty(),
      body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
      body('name').trim().notEmpty(),
    ],
    async (req: Request, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { token, password, name } = req.body;

        // Verify invitation token
        let invitationData;
        try {
          invitationData = authService.verifyInvitationToken(token);
        } catch (error) {
          return res.status(400).json({ error: 'Invalid or expired invitation' });
        }

        const { email, organizationId, teamId, role } = invitationData;

        // Check if user already exists
        const existingUser = await userStore.getUserByEmail(email);
        if (existingUser) {
          // If user exists, just add them to the team
          await organizationStore.addUserToTeam(teamId, existingUser.id, role);
          
          const authToken = authService.generateToken(existingUser);
          res.cookie(authConfig.cookieName, authToken, {
            httpOnly: true,
            secure: authConfig.cookieSecure,
            sameSite: authConfig.cookieSameSite,
            maxAge: authConfig.cookieMaxAge,
          });

          return res.json({
            user: existingUser,
            token: authToken,
            organization: await organizationStore.getOrganization(organizationId),
          });
        }

        // Create new user
        const passwordHash = await authService.hashPassword(password);
        const user = await userStore.createUser({
          email,
          name,
          passwordHash,
          role: 'developer',
          organizationId,
        });

        // Add user to team
        await organizationStore.addUserToTeam(teamId, user.id, role);

        // Generate auth token
        const authToken = authService.generateToken(user);

        // Set cookie
        res.cookie(authConfig.cookieName, authToken, {
          httpOnly: true,
          secure: authConfig.cookieSecure,
          sameSite: authConfig.cookieSameSite,
          maxAge: authConfig.cookieMaxAge,
        });

        res.json({
          user,
          token: authToken,
          organization: await organizationStore.getOrganization(organizationId),
        });
      } catch (error) {
        console.error('Accept invitation error:', error);
        res.status(500).json({ error: 'Failed to accept invitation' });
      }
    }
  );

  return router;
};