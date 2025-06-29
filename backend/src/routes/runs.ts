import { Router } from 'express';
import { TestRunner } from '../services/TestRunner';
import { AuthRequest } from '../middleware/auth';
import { FlowStore } from '../services/FlowStoreMongo';
import { ProjectStore } from '../services/ProjectStoreMongo';

export const runRoutes = (testRunner: TestRunner, flowStore?: FlowStore, projectStore?: ProjectStore) => {
  const router = Router();

  router.get('/', async (req: AuthRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const allRuns = testRunner.getAllRuns();
    // Filter runs by organization
    const orgRuns = allRuns.filter(run => run.organizationId === req.user!.organizationId);
    res.json(orgRuns);
  });

  router.get('/:id', (req: AuthRequest, res) => {
    const run = testRunner.getRun(req.params.id);
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }
    
    // Check if user has access to this run
    if (req.user && run.organizationId !== req.user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(run);
  });

  router.post('/', async (req: AuthRequest, res) => {
    const { flowId, environmentId, selectedSteps } = req.body;
    console.log('POST /runs called with:', { flowId, environmentId, selectedSteps });
    
    if (!flowId) {
      console.log('Missing flowId in request');
      return res.status(400).json({ error: 'flowId is required' });
    }
    
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
      // Verify user has access to the flow
      if (flowStore) {
        const flow = await flowStore.getFlow(flowId);
        if (!flow) {
          return res.status(404).json({ error: 'Flow not found' });
        }
        
        if (flow.projectId && projectStore) {
          const project = await projectStore.getProject(flow.projectId);
          if (project && project.organizationId !== req.user.organizationId) {
            return res.status(403).json({ error: 'Access denied' });
          }
        }
      }
      
      console.log('Starting test run...');
      const runId = await testRunner.startRun(flowId, environmentId, selectedSteps, req.user.organizationId, req.user.userId);
      console.log('Test run started successfully:', runId);
      res.status(201).json({ runId });
    } catch (error) {
      console.error('Failed to start test run:', error);
      res.status(400).json({ error: (error as Error).message });
    }
  });

  router.post('/:id/stop', (req: AuthRequest, res) => {
    const run = testRunner.getRun(req.params.id);
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }
    
    // Check if user has access to this run
    if (req.user && run.organizationId !== req.user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const success = testRunner.stopRun(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Run not found or already stopped' });
    }
    res.json({ message: 'Run stopped successfully' });
  });

  return router;
};