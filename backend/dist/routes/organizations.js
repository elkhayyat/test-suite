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
const mongodb_1 = require("../db/mongodb");
const uuid_1 = require("uuid");
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
        console.log('POST /organizations request body:', req.body);
        const organization = await organizationsService.createOrganization(req.body);
        console.log('Organization created, sending response:', organization);
        res.status(201).json(organization);
    }
    catch (error) {
        console.error('Error in POST /organizations:', error);
        res.status(500).json({
            error: 'Failed to create organization',
            details: error.message || error.toString()
        });
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
// Export organization
router.get('/:id/export', async (req, res) => {
    try {
        const organizationId = req.params.id;
        const organization = await organizationsService.getOrganization(organizationId);
        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }
        const db = await (0, mongodb_1.getDB)();
        // Get all teams in the organization
        const teams = await organizationsService.getTeams(organizationId);
        // Get all team users
        const allTeamUsers = [];
        for (const team of teams) {
            const teamUsers = await organizationsService.getTeamUsers(team.id);
            allTeamUsers.push(...teamUsers);
        }
        // Get all projects in the organization
        const projects = await db.projects.find({ organizationId }).toArray();
        // Get all project teams
        const allProjectTeams = [];
        for (const project of projects) {
            const projectTeams = await organizationsService.getProjectTeams(project.id);
            allProjectTeams.push(...projectTeams);
        }
        // Get all folders in organization projects
        const allFolders = [];
        for (const project of projects) {
            const folders = await db.folders.find({ projectId: project.id }).toArray();
            allFolders.push(...folders);
        }
        // Get all flows in organization projects
        const allFlows = [];
        for (const project of projects) {
            const flows = await db.flows.find({ projectId: project.id }).toArray();
            allFlows.push(...flows);
        }
        const exportData = {
            organization,
            teams,
            teamUsers: allTeamUsers,
            projects,
            projectTeams: allProjectTeams,
            folders: allFolders,
            flows: allFlows,
            exportDate: new Date(),
            version: '1.0'
        };
        res.json(exportData);
    }
    catch (error) {
        console.error('Failed to export organization:', error);
        res.status(500).json({ error: 'Failed to export organization' });
    }
});
// Import organization
router.post('/:id/import', async (req, res) => {
    try {
        const organizationId = req.params.id;
        const { teams, teamUsers, projects, projectTeams, folders, flows } = req.body;
        const organization = await organizationsService.getOrganization(organizationId);
        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }
        const db = await (0, mongodb_1.getDB)();
        // Import teams
        const teamIdMap = {};
        if (teams && Array.isArray(teams)) {
            for (const teamData of teams) {
                const newTeam = await organizationsService.createTeam(organizationId, {
                    name: teamData.name,
                    description: teamData.description
                });
                teamIdMap[teamData.id] = newTeam.id;
            }
        }
        // Import projects
        const projectIdMap = {};
        if (projects && Array.isArray(projects)) {
            for (const projectData of projects) {
                const newProjectId = (0, uuid_1.v4)();
                const newProjectData = {
                    ...projectData,
                    id: newProjectId,
                    organizationId,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                await db.projects.insertOne(newProjectData);
                projectIdMap[projectData.id] = newProjectId;
            }
        }
        // Import folders
        const folderIdMap = {};
        if (folders && Array.isArray(folders)) {
            for (const folderData of folders) {
                const newFolderId = (0, uuid_1.v4)();
                const newFolderData = {
                    ...folderData,
                    id: newFolderId,
                    projectId: projectIdMap[folderData.projectId],
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                await db.folders.insertOne(newFolderData);
                folderIdMap[folderData.id] = newFolderId;
            }
        }
        // Import flows
        const importedFlows = [];
        if (flows && Array.isArray(flows)) {
            for (const flowData of flows) {
                const newFlowId = (0, uuid_1.v4)();
                const newFlowData = {
                    ...flowData,
                    id: newFlowId,
                    projectId: projectIdMap[flowData.projectId],
                    folderId: flowData.folderId ? folderIdMap[flowData.folderId] : null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                await db.flows.insertOne(newFlowData);
                importedFlows.push(newFlowData);
            }
        }
        // Import team users
        if (teamUsers && Array.isArray(teamUsers)) {
            for (const teamUserData of teamUsers) {
                if (teamIdMap[teamUserData.teamId]) {
                    await organizationsService.addUserToTeam(teamIdMap[teamUserData.teamId], teamUserData.userId, teamUserData.role);
                }
            }
        }
        // Import project teams
        if (projectTeams && Array.isArray(projectTeams)) {
            for (const projectTeamData of projectTeams) {
                if (projectIdMap[projectTeamData.projectId] && teamIdMap[projectTeamData.teamId]) {
                    await organizationsService.addTeamToProject(projectIdMap[projectTeamData.projectId], teamIdMap[projectTeamData.teamId], projectTeamData.permissions);
                }
            }
        }
        res.json({
            message: 'Organization imported successfully',
            importedTeams: Object.keys(teamIdMap).length,
            importedProjects: Object.keys(projectIdMap).length,
            importedFolders: Object.keys(folderIdMap).length,
            importedFlows: importedFlows.length
        });
    }
    catch (error) {
        console.error('Failed to import organization:', error);
        res.status(500).json({ error: 'Failed to import organization' });
    }
});
exports.default = router;
//# sourceMappingURL=organizations.js.map