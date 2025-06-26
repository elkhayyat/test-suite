"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const organizationsService = __importStar(require("../services/organizations"));
const router = (0, express_1.Router)();
// Organization routes
router.get('/', async (req, res) => {
    try {
        const organizations = await organizationsService.getOrganizations();
        res.json(organizations);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to get organizations' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const organization = await organizationsService.getOrganization(req.params.id);
        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }
        res.json(organization);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to get organization' });
    }
});
router.post('/', async (req, res) => {
    try {
        const organization = await organizationsService.createOrganization(req.body);
        res.status(201).json(organization);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create organization' });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const organization = await organizationsService.updateOrganization(req.params.id, req.body);
        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }
        res.json(organization);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update organization' });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await organizationsService.deleteOrganization(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Organization not found' });
        }
        res.status(204).send();
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to delete organization' });
    }
});
// Team routes
router.get('/:orgId/teams', async (req, res) => {
    try {
        const teams = await organizationsService.getTeams(req.params.orgId);
        res.json(teams);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to get teams' });
    }
});
router.post('/:orgId/teams', async (req, res) => {
    try {
        const team = await organizationsService.createTeam(req.params.orgId, req.body);
        res.status(201).json(team);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create team' });
    }
});
router.put('/:orgId/teams/:teamId', async (req, res) => {
    try {
        const team = await organizationsService.updateTeam(req.params.teamId, req.body);
        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }
        res.json(team);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update team' });
    }
});
router.delete('/:orgId/teams/:teamId', async (req, res) => {
    try {
        const deleted = await organizationsService.deleteTeam(req.params.teamId);
        if (!deleted) {
            return res.status(404).json({ error: 'Team not found' });
        }
        res.status(204).send();
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete team' });
    }
});
// Team user routes
router.get('/:orgId/teams/:teamId/users', async (req, res) => {
    try {
        const users = await organizationsService.getTeamUsers(req.params.teamId);
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to get team users' });
    }
});
router.post('/:orgId/teams/:teamId/users', async (req, res) => {
    try {
        const { userId, role } = req.body;
        if (!userId || !role) {
            return res.status(400).json({ error: 'userId and role are required' });
        }
        const teamUser = await organizationsService.addUserToTeam(req.params.teamId, userId, role);
        res.status(201).json(teamUser);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to add user to team' });
    }
});
router.put('/:orgId/teams/:teamId/users/:userId', async (req, res) => {
    try {
        const { role } = req.body;
        if (!role) {
            return res.status(400).json({ error: 'role is required' });
        }
        const teamUser = await organizationsService.updateTeamUserRole(req.params.teamId, req.params.userId, role);
        if (!teamUser) {
            return res.status(404).json({ error: 'Team user not found' });
        }
        res.json(teamUser);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update team user role' });
    }
});
router.delete('/:orgId/teams/:teamId/users/:userId', async (req, res) => {
    try {
        const deleted = await organizationsService.removeUserFromTeam(req.params.teamId, req.params.userId);
        if (!deleted) {
            return res.status(404).json({ error: 'Team user not found' });
        }
        res.status(204).send();
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to remove user from team' });
    }
});
exports.default = router;
//# sourceMappingURL=organizations.js.map