import { Router } from 'express';
import { ProjectStore } from '../services/ProjectStoreMongo';
import { FlowStore } from '../services/FlowStoreMongo';
import * as organizationsService from '../services/organizations';

export const projectRoutes = (projectStore: ProjectStore, flowStore?: FlowStore) => {
  const router = Router();

  // Get all projects
  router.get('/', async (req, res) => {
    try {
      const projects = await projectStore.getProjects();
      res.json(projects);
    } catch (error) {
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
    } catch (error) {
      res.status(500).json({ error: 'Failed to get project' });
    }
  });

  // Create project
  router.post('/', async (req, res) => {
    try {
      const project = await projectStore.createProject(req.body);
      res.status(201).json(project);
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete project' });
    }
  });

  // Get project folders
  router.get('/:id/folders', async (req, res) => {
    try {
      const folders = await projectStore.getFolders(req.params.id);
      res.json(folders);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get folders' });
    }
  });

  // Get project folder tree
  router.get('/:id/folder-tree', async (req, res) => {
    try {
      const tree = await projectStore.getFolderTree(req.params.id);
      res.json(tree);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get folder tree' });
    }
  });

  // Create folder
  router.post('/:id/folders', async (req, res) => {
    try {
      const folder = await projectStore.createFolder(req.params.id, req.body);
      res.status(201).json(folder);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create folder' });
    }
  });

  // Update folder
  router.put('/:projectId/folders/:folderId', async (req, res) => {
    try {
      const folder = await projectStore.updateFolder(
        req.params.projectId,
        req.params.folderId,
        req.body
      );
      if (!folder) {
        return res.status(404).json({ error: 'Folder not found' });
      }
      res.json(folder);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update folder' });
    }
  });

  // Delete folder
  router.delete('/:projectId/folders/:folderId', async (req, res) => {
    try {
      const success = await projectStore.deleteFolder(
        req.params.projectId,
        req.params.folderId
      );
      if (!success) {
        return res.status(404).json({ error: 'Folder not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete folder' });
    }
  });

  // Project team routes
  router.get('/:id/teams', async (req, res) => {
    try {
      const teams = await organizationsService.getProjectTeams(req.params.id);
      res.json(teams);
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      res.status(500).json({ error: 'Failed to remove team from project' });
    }
  });

  // Export project
  router.get('/:id/export', async (req, res) => {
    if (!flowStore) {
      return res.status(500).json({ error: 'FlowStore not available' });
    }
    
    try {
      const projectId = req.params.id;
      const project = await projectStore.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const flows = await flowStore.getFlowsByProject(projectId);
      const folders = await projectStore.getFolders(projectId);

      const exportData = {
        project,
        flows,
        folders,
        exportDate: new Date(),
        version: '1.0'
      };

      res.json(exportData);
    } catch (error) {
      console.error('Failed to export project:', error);
      res.status(500).json({ error: 'Failed to export project' });
    }
  });

  // Import project
  router.post('/:id/import', async (req, res) => {
    if (!flowStore) {
      return res.status(500).json({ error: 'FlowStore not available' });
    }

    try {
      const projectId = req.params.id;
      const { flows, folders } = req.body;

      if (!flows || !Array.isArray(flows)) {
        return res.status(400).json({ error: 'Invalid import data: flows array required' });
      }

      const project = await projectStore.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Import folders first
      const folderIdMap: { [oldId: string]: string } = {};
      if (folders && Array.isArray(folders)) {
        for (const folderData of folders) {
          const newFolder = await projectStore.createFolder(projectId, {
            name: folderData.name,
            description: folderData.description
          });
          folderIdMap[folderData.id] = newFolder.id;
        }
      }

      // Import flows
      const importedFlows = [];
      for (const flowData of flows) {
        const newFlowData = {
          ...flowData,
          projectId,
          folderId: flowData.folderId ? folderIdMap[flowData.folderId] : null
        };
        delete newFlowData.id;
        delete newFlowData.createdAt;
        delete newFlowData.updatedAt;

        const newFlow = await flowStore.createFlow(newFlowData);
        importedFlows.push(newFlow);
      }

      res.json({
        message: 'Project imported successfully',
        importedFlows: importedFlows.length,
        importedFolders: Object.keys(folderIdMap).length
      });
    } catch (error) {
      console.error('Failed to import project:', error);
      res.status(500).json({ error: 'Failed to import project' });
    }
  });

  return router;
};