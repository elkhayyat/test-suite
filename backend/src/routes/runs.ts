import { Router } from 'express';
import { TestRunner } from '../services/TestRunner';
import { AuthRequest } from '../middleware/auth';
import { FlowStore } from '../services/FlowStoreMongo';
import { ProjectStore } from '../services/ProjectStoreMongo';
import { TestRunStoreMongo } from '../services/TestRunStoreMongo';

export const runRoutes = (testRunner: TestRunner, flowStore?: FlowStore, projectStore?: ProjectStore, runStore?: TestRunStoreMongo) => {
  const router = Router();

  router.get('/', async (req: AuthRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
      let runs;
      if (runStore) {
        // Fetch from database if runStore is available
        runs = await runStore.getRunsByOrganization(req.user.organizationId);
      } else {
        // Fallback to in-memory runs
        const allRuns = testRunner.getAllRuns();
        runs = allRuns.filter(run => run.organizationId === req.user!.organizationId);
      }
      res.json(runs);
    } catch (error) {
      console.error('Failed to fetch test runs:', error);
      res.status(500).json({ error: 'Failed to fetch test runs' });
    }
  });

  router.get('/:id', async (req: AuthRequest, res) => {
    try {
      let run;
      if (runStore) {
        // Try database first
        run = await runStore.getRun(req.params.id);
      }
      
      // If not found in database or no runStore, try in-memory
      if (!run) {
        run = testRunner.getRun(req.params.id);
      }
      
      if (!run) {
        return res.status(404).json({ error: 'Run not found' });
      }
      
      // Check if user has access to this run
      if (req.user && run.organizationId !== req.user.organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      res.json(run);
    } catch (error) {
      console.error('Failed to fetch test run:', error);
      res.status(500).json({ error: 'Failed to fetch test run' });
    }
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

  router.post('/:id/stop', async (req: AuthRequest, res) => {
    const run = testRunner.getRun(req.params.id);
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }
    
    // Check if user has access to this run
    if (req.user && run.organizationId !== req.user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const success = await testRunner.stopRun(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Run not found or already stopped' });
    }
    res.json({ message: 'Run stopped successfully' });
  });

  return router;
};