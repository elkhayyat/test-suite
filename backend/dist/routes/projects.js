"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectRoutes = void 0;
const express_1 = require("express");
const ProjectStore_1 = require("../services/ProjectStore");
const projectStore = new ProjectStore_1.ProjectStore();
exports.projectRoutes = (0, express_1.Router)();
// Get all projects
exports.projectRoutes.get('/', async (req, res) => {
    try {
        const projects = await projectStore.getProjects();
        res.json(projects);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});
// Get single project
exports.projectRoutes.get('/:id', async (req, res) => {
    try {
        const project = await projectStore.getProject(req.params.id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.json(project);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch project' });
    }
});
// Create project
exports.projectRoutes.post('/', async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }
        const project = await projectStore.createProject({
            name,
            description
        });
        res.status(201).json(project);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create project' });
    }
});
// Update project
exports.projectRoutes.put('/:id', async (req, res) => {
    try {
        const { name, description } = req.body;
        const project = await projectStore.updateProject(req.params.id, {
            name,
            description
        });
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
exports.projectRoutes.delete('/:id', async (req, res) => {
    try {
        const success = await projectStore.deleteProject(req.params.id);
        if (!success) {
            return res.status(404).json({ error: 'Project not found or is default' });
        }
        res.status(204).send();
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete project' });
    }
});
// Get project folders
exports.projectRoutes.get('/:id/folders', async (req, res) => {
    try {
        const folders = await projectStore.getFolders(req.params.id);
        res.json(folders);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch folders' });
    }
});
// Get folder tree
exports.projectRoutes.get('/:id/folder-tree', async (req, res) => {
    try {
        const tree = await projectStore.getFolderTree(req.params.id);
        res.json(tree);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch folder tree' });
    }
});
// Create folder
exports.projectRoutes.post('/:id/folders', async (req, res) => {
    try {
        const { name, parentId } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }
        const folder = await projectStore.createFolder({
            projectId: req.params.id,
            name,
            parentId
        });
        res.status(201).json(folder);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create folder' });
    }
});
// Update folder
exports.projectRoutes.put('/:projectId/folders/:folderId', async (req, res) => {
    try {
        const { name, parentId } = req.body;
        const folder = await projectStore.updateFolder(req.params.folderId, {
            name,
            parentId
        });
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
exports.projectRoutes.delete('/:projectId/folders/:folderId', async (req, res) => {
    try {
        const success = await projectStore.deleteFolder(req.params.folderId);
        if (!success) {
            return res.status(404).json({ error: 'Folder not found' });
        }
        res.status(204).send();
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete folder' });
    }
});
//# sourceMappingURL=projects.js.map