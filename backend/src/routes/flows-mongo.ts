import { Router } from 'express';
import { FlowStore } from '../services/FlowStoreMongo';

export const flowRoutes = (flowStore: FlowStore) => {
  const router = Router();

  router.get('/', async (req, res) => {
    const flows = await flowStore.getAllFlows();
    res.json(flows);
  });

  router.get('/:id', async (req, res) => {
    const flow = await flowStore.getFlow(req.params.id);
    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' });
    }
    res.json(flow);
  });

  router.post('/', async (req, res) => {
    const flow = await flowStore.createFlow(req.body);
    res.status(201).json(flow);
  });

  router.put('/:id', async (req, res) => {
    const flow = await flowStore.updateFlow(req.params.id, req.body);
    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' });
    }
    res.json(flow);
  });

  router.delete('/:id', async (req, res) => {
    const success = await flowStore.deleteFlow(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Flow not found' });
    }
    res.status(204).send();
  });

  return router;
};