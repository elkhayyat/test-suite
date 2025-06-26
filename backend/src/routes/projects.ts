import { Router } from 'express';
import { ProjectStore } from '../services/ProjectStore';
import * as organizationsService from '../services/organizations';

const projectStore = new ProjectStore();

export const projectRoutes = Router();

// Get all projects
projectRoutes.get('/', async (req, res) => {
  try {
    const projects = await projectStore.getProjects();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get single project
projectRoutes.get('/:id', async (req, res) => {
  try {
    const project = await projectStore.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Create project
projectRoutes.post('/', async (req, res) => {
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project
projectRoutes.put('/:id', async (req, res) => {
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project
projectRoutes.delete('/:id', async (req, res) => {
  try {
    const success = await projectStore.deleteProject(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Project not found or is default' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Get project folders
projectRoutes.get('/:id/folders', async (req, res) => {
  try {
    const folders = await projectStore.getFolders(req.params.id);
    res.json(folders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

// Get folder tree
projectRoutes.get('/:id/folder-tree', async (req, res) => {
  try {
    const tree = await projectStore.getFolderTree(req.params.id);
    res.json(tree);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch folder tree' });
  }
});

// Create folder
projectRoutes.post('/:id/folders', async (req, res) => {
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Update folder
projectRoutes.put('/:projectId/folders/:folderId', async (req, res) => {
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to update folder' });
  }
});

// Delete folder
projectRoutes.delete('/:projectId/folders/:folderId', async (req, res) => {
  try {
    const success = await projectStore.deleteFolder(req.params.folderId);
    if (!success) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// Project team routes
projectRoutes.get('/:id/teams', async (req, res) => {
  try {
    const teams = await organizationsService.getProjectTeams(req.params.id);
    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project teams' });
  }
});

projectRoutes.post('/:id/teams', async (req, res) => {
  try {
    const { teamId, permissions } = req.body;
    if (!teamId || !permissions) {
      return res.status(400).json({ error: 'teamId and permissions are required' });
    }
    const projectTeam = await organizationsService.addTeamToProject(req.params.id, teamId, permissions);
    res.status(201).json(projectTeam);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add team to project' });
  }
});

projectRoutes.put('/:id/teams/:teamId', async (req, res) => {
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to update project team permissions' });
  }
});

projectRoutes.delete('/:id/teams/:teamId', async (req, res) => {
  try {
    const deleted = await organizationsService.removeTeamFromProject(req.params.id, req.params.teamId);
    if (!deleted) {
      return res.status(404).json({ error: 'Project team not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove team from project' });
  }
});