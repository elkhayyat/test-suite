import { Router } from 'express';
import { FlowStore } from '../services/FlowStore';

export const flowStore = new FlowStore();
export const flowRoutes = Router();

flowRoutes.get('/', (req, res) => {
  const flows = flowStore.getAllFlows();
  res.json(flows);
});

flowRoutes.get('/:id', (req, res) => {
  const flow = flowStore.getFlow(req.params.id);
  if (!flow) {
    return res.status(404).json({ error: 'Flow not found' });
  }
  res.json(flow);
});

flowRoutes.post('/', (req, res) => {
  const flow = flowStore.createFlow(req.body);
  res.status(201).json(flow);
});

flowRoutes.put('/:id', (req, res) => {
  const flow = flowStore.updateFlow(req.params.id, req.body);
  if (!flow) {
    return res.status(404).json({ error: 'Flow not found' });
  }
  res.json(flow);
});

flowRoutes.delete('/:id', (req, res) => {
  const success = flowStore.deleteFlow(req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'Flow not found' });
  }
  res.status(204).send();
});