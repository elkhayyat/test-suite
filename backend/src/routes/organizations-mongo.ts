import { Router } from 'express';
import { OrganizationStoreMongo } from '../services/OrganizationStoreMongo';
import { AuthRequest } from '../middleware/auth';

export const organizationRoutes = (organizationStore: OrganizationStoreMongo) => {
  const router = Router();

  // Get user's organizations
  router.get('/my', async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const organizations = await organizationStore.getUserOrganizations(req.user.userId);
      res.json(organizations);
    } catch (error) {
      console.error('Failed to get user organizations:', error);
      res.status(500).json({ error: 'Failed to get organizations' });
    }
  });

  // Get all organizations (admin only)
  router.get('/', async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Only system admins can see all organizations
      if (req.user.role !== 'admin') {
        // Regular users only see their organizations
        const organizations = await organizationStore.getUserOrganizations(req.user.userId);
        return res.json(organizations);
      }

      // Admins see all organizations
      const organizations = await organizationStore.getOrganizations();
      res.json(organizations);
    } catch (error) {
      console.error('Failed to get organizations:', error);
      res.status(500).json({ error: 'Failed to get organizations' });
    }
  });

  // Get single organization
  router.get('/:id', async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const organization = await organizationStore.getOrganization(req.params.id);
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      // Check if user belongs to this organization
      const isMember = await organizationStore.isUserInOrganization(req.user.userId, req.params.id);
      if (!isMember && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json(organization);
    } catch (error) {
      console.error('Failed to get organization:', error);
      res.status(500).json({ error: 'Failed to get organization' });
    }
  });

  // Create organization (admin only)
  router.post('/', async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const organization = await organizationStore.createOrganization(req.body);
      res.status(201).json(organization);
    } catch (error) {
      console.error('Failed to create organization:', error);
      res.status(500).json({ error: 'Failed to create organization' });
    }
  });

  // Update organization
  router.put('/:id', async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Check if user is organization admin
      const userRole = await organizationStore.getUserOrganizationRole(req.user.userId, req.params.id);
      if (!userRole || (userRole !== 'owner' && userRole !== 'admin' && req.user.role !== 'admin')) {
        return res.status(403).json({ error: 'Organization admin access required' });
      }

      const organization = await organizationStore.updateOrganization(req.params.id, req.body);
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      res.json(organization);
    } catch (error) {
      console.error('Failed to update organization:', error);
      res.status(500).json({ error: 'Failed to update organization' });
    }
  });

  // Delete organization (admin only)
  router.delete('/:id', async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const deleted = await organizationStore.deleteOrganization(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      res.status(204).send();
    } catch (error: any) {
      console.error('Failed to delete organization:', error);
      res.status(400).json({ error: error.message || 'Failed to delete organization' });
    }
  });

  // Team routes
  router.get('/:organizationId/teams', async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Check if user belongs to this organization
      const isMember = await organizationStore.isUserInOrganization(req.user.userId, req.params.organizationId);
      if (!isMember && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const teams = await organizationStore.getTeamsByOrganization(req.params.organizationId);
      res.json(teams);
    } catch (error) {
      console.error('Failed to get teams:', error);
      res.status(500).json({ error: 'Failed to get teams' });
    }
  });

  router.get('/:organizationId/teams/:teamId', async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const team = await organizationStore.getTeam(req.params.teamId);
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Verify team belongs to organization
      if (team.organizationId !== req.params.organizationId) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Check if user belongs to this organization
      const isMember = await organizationStore.isUserInOrganization(req.user.userId, req.params.organizationId);
      if (!isMember && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json(team);
    } catch (error) {
      console.error('Failed to get team:', error);
      res.status(500).json({ error: 'Failed to get team' });
    }
  });

  router.post('/:organizationId/teams', async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Check if user is organization admin
      const userRole = await organizationStore.getUserOrganizationRole(req.user.userId, req.params.organizationId);
      if (!userRole || (userRole !== 'owner' && userRole !== 'admin')) {
        return res.status(403).json({ error: 'Organization admin access required' });
      }

      const team = await organizationStore.createTeam({
        ...req.body,
        organizationId: req.params.organizationId,
      });

      res.status(201).json(team);
    } catch (error) {
      console.error('Failed to create team:', error);
      res.status(500).json({ error: 'Failed to create team' });
    }
  });

  router.put('/:organizationId/teams/:teamId', async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const team = await organizationStore.getTeam(req.params.teamId);
      if (!team || team.organizationId !== req.params.organizationId) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Check if user is team admin
      const teamUsers = await organizationStore.getTeamUsers(req.params.teamId);
      const userTeamRole = teamUsers.find(tu => tu.userId === req.user!.userId);
      if (!userTeamRole || (userTeamRole.role !== 'owner' && userTeamRole.role !== 'admin')) {
        return res.status(403).json({ error: 'Team admin access required' });
      }

      const updatedTeam = await organizationStore.updateTeam(req.params.teamId, req.body);
      res.json(updatedTeam);
    } catch (error) {
      console.error('Failed to update team:', error);
      res.status(500).json({ error: 'Failed to update team' });
    }
  });

  router.delete('/:organizationId/teams/:teamId', async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Check if user is organization admin
      const userRole = await organizationStore.getUserOrganizationRole(req.user.userId, req.params.organizationId);
      if (!userRole || (userRole !== 'owner' && userRole !== 'admin')) {
        return res.status(403).json({ error: 'Organization admin access required' });
      }

      const deleted = await organizationStore.deleteTeam(req.params.teamId);
      if (!deleted) {
        return res.status(404).json({ error: 'Team not found' });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete team:', error);
      res.status(500).json({ error: 'Failed to delete team' });
    }
  });

  // Team users routes
  router.get('/:organizationId/teams/:teamId/users', async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Check if user belongs to this team
      const teamUsers = await organizationStore.getTeamUsers(req.params.teamId);
      const isMember = teamUsers.some(tu => tu.userId === req.user!.userId);
      if (!isMember && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get team users with user details (email, name)
      const teamUsersWithDetails = await organizationStore.getTeamUsersWithDetails(req.params.teamId);
      res.json(teamUsersWithDetails);
    } catch (error) {
      console.error('Failed to get team users:', error);
      res.status(500).json({ error: 'Failed to get team users' });
    }
  });

  router.post('/:organizationId/teams/:teamId/users', async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { userId, role } = req.body;
      if (!userId || !role) {
        return res.status(400).json({ error: 'userId and role are required' });
      }

      // Check if user is team admin
      const teamUsers = await organizationStore.getTeamUsers(req.params.teamId);
      const userTeamRole = teamUsers.find(tu => tu.userId === req.user!.userId);
      if (!userTeamRole || (userTeamRole.role !== 'owner' && userTeamRole.role !== 'admin')) {
        return res.status(403).json({ error: 'Team admin access required' });
      }

      const teamUser = await organizationStore.addUserToTeam(req.params.teamId, userId, role);
      res.status(201).json(teamUser);
    } catch (error) {
      console.error('Failed to add user to team:', error);
      res.status(500).json({ error: 'Failed to add user to team' });
    }
  });

  router.put('/:organizationId/teams/:teamId/users/:userId', async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { role } = req.body;
      if (!role) {
        return res.status(400).json({ error: 'role is required' });
      }

      // Check if user is team admin
      const teamUsers = await organizationStore.getTeamUsers(req.params.teamId);
      const userTeamRole = teamUsers.find(tu => tu.userId === req.user!.userId);
      if (!userTeamRole || (userTeamRole.role !== 'owner' && userTeamRole.role !== 'admin')) {
        return res.status(403).json({ error: 'Team admin access required' });
      }

      const updated = await organizationStore.updateTeamUserRole(req.params.teamId, req.params.userId, role);
      if (!updated) {
        return res.status(404).json({ error: 'Team user not found' });
      }

      res.json(updated);
    } catch (error) {
      console.error('Failed to update team user role:', error);
      res.status(500).json({ error: 'Failed to update team user role' });
    }
  });

  router.delete('/:organizationId/teams/:teamId/users/:userId', async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Check if user is team admin
      const teamUsers = await organizationStore.getTeamUsers(req.params.teamId);
      const userTeamRole = teamUsers.find(tu => tu.userId === req.user!.userId);
      if (!userTeamRole || (userTeamRole.role !== 'owner' && userTeamRole.role !== 'admin')) {
        return res.status(403).json({ error: 'Team admin access required' });
      }

      const deleted = await organizationStore.removeUserFromTeam(req.params.teamId, req.params.userId);
      if (!deleted) {
        return res.status(404).json({ error: 'Team user not found' });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Failed to remove user from team:', error);
      res.status(500).json({ error: 'Failed to remove user from team' });
    }
  });

  return router;
};