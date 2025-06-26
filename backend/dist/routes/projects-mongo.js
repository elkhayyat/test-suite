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
exports.projectRoutes = void 0;
const express_1 = require("express");
const organizationsService = __importStar(require("../services/organizations"));
const projectRoutes = (projectStore) => {
    const router = (0, express_1.Router)();
    // Get all projects
    router.get('/', async (req, res) => {
        try {
            const projects = await projectStore.getProjects();
            res.json(projects);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to get projects' });
        }
    });
    // Get single project
    router.get('/:id', async (req, res) => {
        try {
            const project = await projectStore.getProject(req.params.id);
            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }
            res.json(project);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to get project' });
        }
    });
    // Create project
    router.post('/', async (req, res) => {
        try {
            const project = await projectStore.createProject(req.body);
            res.status(201).json(project);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to create project' });
        }
    });
    // Update project
    router.put('/:id', async (req, res) => {
        try {
            const project = await projectStore.updateProject(req.params.id, req.body);
            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }
            res.json(project);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to update project' });
        }
    });
    // Delete project
    router.delete('/:id', async (req, res) => {
        try {
            const success = await projectStore.deleteProject(req.params.id);
            if (!success) {
                return res.status(404).json({ error: 'Project not found' });
            }
            res.status(204).send();
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to delete project' });
        }
    });
    // Get project folders
    router.get('/:id/folders', async (req, res) => {
        try {
            const folders = await projectStore.getFolders(req.params.id);
            res.json(folders);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to get folders' });
        }
    });
    // Get project folder tree
    router.get('/:id/folder-tree', async (req, res) => {
        try {
            const tree = await projectStore.getFolderTree(req.params.id);
            res.json(tree);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to get folder tree' });
        }
    });
    // Create folder
    router.post('/:id/folders', async (req, res) => {
        try {
            const folder = await projectStore.createFolder(req.params.id, req.body);
            res.status(201).json(folder);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to create folder' });
        }
    });
    // Update folder
    router.put('/:projectId/folders/:folderId', async (req, res) => {
        try {
            const folder = await projectStore.updateFolder(req.params.projectId, req.params.folderId, req.body);
            if (!folder) {
                return res.status(404).json({ error: 'Folder not found' });
            }
            res.json(folder);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to update folder' });
        }
    });
    // Delete folder
    router.delete('/:projectId/folders/:folderId', async (req, res) => {
        try {
            const success = await projectStore.deleteFolder(req.params.projectId, req.params.folderId);
            if (!success) {
                return res.status(404).json({ error: 'Folder not found' });
            }
            res.status(204).send();
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to delete folder' });
        }
    });
    // Project team routes
    router.get('/:id/teams', async (req, res) => {
        try {
            const teams = await organizationsService.getProjectTeams(req.params.id);
            res.json(teams);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch project teams' });
        }
    });
    router.post('/:id/teams', async (req, res) => {
        try {
            const { teamId, permissions } = req.body;
            if (!teamId || !permissions) {
                return res.status(400).json({ error: 'teamId and permissions are required' });
            }
            const projectTeam = await organizationsService.addTeamToProject(req.params.id, teamId, permissions);
            res.status(201).json(projectTeam);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to add team to project' });
        }
    });
    router.put('/:id/teams/:teamId', async (req, res) => {
        try {
            const { permissions } = req.body;
            if (!permissions) {
                return res.status(400).json({ error: 'permissions is required' });
            }
            const projectTeam = await organizationsService.updateProjectTeamPermissions(req.params.id, req.params.teamId, permissions);
            if (!projectTeam) {
                return res.status(404).json({ error: 'Project team not found' });
            }
            res.json(projectTeam);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to update project team permissions' });
        }
    });
    router.delete('/:id/teams/:teamId', async (req, res) => {
        try {
            const deleted = await organizationsService.removeTeamFromProject(req.params.id, req.params.teamId);
            if (!deleted) {
                return res.status(404).json({ error: 'Project team not found' });
            }
            res.status(204).send();
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to remove team from project' });
        }
    });
    return router;
};
exports.projectRoutes = projectRoutes;
//# sourceMappingURL=projects-mongo.js.map