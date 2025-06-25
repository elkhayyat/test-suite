import { Router } from 'express';
import { EnvironmentStore } from '../services/EnvironmentStore';

const environmentStore = new EnvironmentStore();

export const environmentRoutes = Router();

// Get all environments
environmentRoutes.get('/', async (req, res) => {
  try {
    const environments = await environmentStore.getEnvironments();
    res.json(environments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch environments' });
  }
});

// Get single environment
environmentRoutes.get('/:id', async (req, res) => {
  try {
    const environment = await environmentStore.getEnvironment(req.params.id);
    if (!environment) {
      return res.status(404).json({ error: 'Environment not found' });
    }
    res.json(environment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch environment' });
  }
});

// Create environment
environmentRoutes.post('/', async (req, res) => {
  try {
    const { name, description, isDefault } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const environment = await environmentStore.createEnvironment({
      name,
      description,
      isDefault
    });
    res.status(201).json(environment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create environment' });
  }
});

// Update environment
environmentRoutes.put('/:id', async (req, res) => {
  try {
    const { name, description, isDefault } = req.body;
    const environment = await environmentStore.updateEnvironment(req.params.id, {
      name,
      description,
      isDefault
    });
    
    if (!environment) {
      return res.status(404).json({ error: 'Environment not found' });
    }
    
    res.json(environment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update environment' });
  }
});

// Delete environment
environmentRoutes.delete('/:id', async (req, res) => {
  try {
    const success = await environmentStore.deleteEnvironment(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Environment not found or is default' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete environment' });
  }
});

// Get environment variables
environmentRoutes.get('/:id/variables', async (req, res) => {
  try {
    const variables = await environmentStore.getEnvironmentVariables(req.params.id);
    res.json(variables);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch environment variables' });
  }
});

// Set environment variable
environmentRoutes.put('/:id/variables/:key', async (req, res) => {
  try {
    const { value, isSecret } = req.body;
    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }
    
    const variable = await environmentStore.setEnvironmentVariable(
      req.params.id,
      req.params.key,
      value,
      isSecret
    );
    res.json(variable);
  } catch (error) {
    res.status(500).json({ error: 'Failed to set environment variable' });
  }
});

// Delete environment variable
environmentRoutes.delete('/:id/variables/:key', async (req, res) => {
  try {
    const success = await environmentStore.deleteEnvironmentVariable(
      req.params.id,
      req.params.key
    );
    if (!success) {
      return res.status(404).json({ error: 'Variable not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete environment variable' });
  }
});