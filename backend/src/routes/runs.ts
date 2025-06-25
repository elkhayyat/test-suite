import { Router } from 'express';
import { TestRunner } from '../services/TestRunner';

export const runRoutes = (testRunner: TestRunner) => {
  const router = Router();

  router.get('/', (req, res) => {
    const runs = testRunner.getAllRuns();
    res.json(runs);
  });

  router.get('/:id', (req, res) => {
    const run = testRunner.getRun(req.params.id);
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }
    res.json(run);
  });

  router.post('/', async (req, res) => {
    const { flowId } = req.body;
    if (!flowId) {
      return res.status(400).json({ error: 'flowId is required' });
    }
    
    try {
      const runId = await testRunner.startRun(flowId);
      res.status(201).json({ runId });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  router.post('/:id/stop', (req, res) => {
    const success = testRunner.stopRun(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Run not found or already stopped' });
    }
    res.json({ message: 'Run stopped successfully' });
  });

  return router;
};