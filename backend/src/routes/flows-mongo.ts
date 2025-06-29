import { Router } from 'express';
import { FlowStore } from '../services/FlowStoreMongo';
import { ProjectStore } from '../services/ProjectStoreMongo';
import { OrganizationStoreMongo } from '../services/OrganizationStoreMongo';
import { AuthRequest } from '../middleware/auth';
import { Project } from '../../../shared/src/types';

export const flowRoutes = (flowStore: FlowStore, projectStore?: ProjectStore, organizationStore?: OrganizationStoreMongo) => {
  const router = Router();

  router.get('/', async (req: AuthRequest, res) => {
    try {
      if (!req.user || !projectStore || !organizationStore) {
        const flows = await flowStore.getAllFlows();
        return res.json(flows);
      }

      // Get user's organization projects
      const projects = await projectStore.getProjectsByOrganization(req.user.organizationId);
      const projectIds = projects.map((p: Project) => p.id);

      // Get flows for these projects
      const flows = await flowStore.getAllFlows();
      const filteredFlows = flows.filter(flow => 
        flow.projectId && projectIds.includes(flow.projectId)
      );

      res.json(filteredFlows);
    } catch (error) {
      console.error('Get flows error:', error);
      res.status(500).json({ error: 'Failed to get flows' });
    }
  });

  router.get('/:id', async (req: AuthRequest, res) => {
    try {
      const flow = await flowStore.getFlow(req.params.id);
      if (!flow) {
        return res.status(404).json({ error: 'Flow not found' });
      }

      // Check if user has access to this flow
      if (req.user && flow.projectId && projectStore && organizationStore) {
        const project = await projectStore.getProject(flow.projectId);
        if (project && project.organizationId !== req.user.organizationId) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      res.json(flow);
    } catch (error) {
      console.error('Get flow error:', error);
      res.status(500).json({ error: 'Failed to get flow' });
    }
  });

  router.post('/', async (req: AuthRequest, res) => {
    try {
      const flowData = req.body;

      // Verify project belongs to user's organization
      if (req.user && flowData.projectId && projectStore) {
        const project = await projectStore.getProject(flowData.projectId);
        if (!project || project.organizationId !== req.user.organizationId) {
          return res.status(403).json({ error: 'Invalid project' });
        }
      }

      const flow = await flowStore.createFlow(flowData);
      res.status(201).json(flow);
    } catch (error) {
      console.error('Create flow error:', error);
      res.status(500).json({ error: 'Failed to create flow' });
    }
  });

  router.put('/:id', async (req: AuthRequest, res) => {
    try {
      const existingFlow = await flowStore.getFlow(req.params.id);
      if (!existingFlow) {
        return res.status(404).json({ error: 'Flow not found' });
      }

      // Check if user has access to this flow
      if (req.user && existingFlow.projectId && projectStore && organizationStore) {
        const project = await projectStore.getProject(existingFlow.projectId);
        if (project && project.organizationId !== req.user.organizationId) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      const flow = await flowStore.updateFlow(req.params.id, req.body);
      res.json(flow);
    } catch (error) {
      console.error('Update flow error:', error);
      res.status(500).json({ error: 'Failed to update flow' });
    }
  });

  router.delete('/:id', async (req: AuthRequest, res) => {
    try {
      const flow = await flowStore.getFlow(req.params.id);
      if (!flow) {
        return res.status(404).json({ error: 'Flow not found' });
      }

      // Check if user has access to this flow
      if (req.user && flow.projectId && projectStore && organizationStore) {
        const project = await projectStore.getProject(flow.projectId);
        if (project && project.organizationId !== req.user.organizationId) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      const success = await flowStore.deleteFlow(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Delete flow error:', error);
      res.status(500).json({ error: 'Failed to delete flow' });
    }
  });

  return router;
};