import { Router } from 'express';
import { EnvironmentStore } from '../services/EnvironmentStoreMongo';
import { AuthRequest } from '../middleware/auth';

export const environmentRoutes = (environmentStore: EnvironmentStore) => {
  const router = Router();

  // Get all environments for the user's organization
  router.get('/', async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const environments = await environmentStore.getEnvironmentsByOrganization(req.user.organizationId);
      res.json(environments);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get environments' });
    }
  });

  // Get single environment
  router.get('/:id', async (req: AuthRequest, res) => {
    try {
      const environment = await environmentStore.getEnvironment(req.params.id);
      if (!environment) {
        return res.status(404).json({ error: 'Environment not found' });
      }
      
      // Check if user has access to this environment
      if (req.user && environment.organizationId !== req.user.organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      res.json(environment);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get environment' });
    }
  });

  // Create environment
  router.post('/', async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const environmentData = {
        ...req.body,
        organizationId: req.user.organizationId
      };
      
      const environment = await environmentStore.createEnvironment(environmentData);
      res.status(201).json(environment);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create environment' });
    }
  });

  // Update environment
  router.put('/:id', async (req: AuthRequest, res) => {
    try {
      const existingEnv = await environmentStore.getEnvironment(req.params.id);
      if (!existingEnv) {
        return res.status(404).json({ error: 'Environment not found' });
      }
      
      // Check if user has access to this environment
      if (req.user && existingEnv.organizationId !== req.user.organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const environment = await environmentStore.updateEnvironment(req.params.id, req.body);
      res.json(environment);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update environment' });
    }
  });

  // Delete environment
  router.delete('/:id', async (req: AuthRequest, res) => {
    try {
      const environment = await environmentStore.getEnvironment(req.params.id);
      if (!environment) {
        return res.status(404).json({ error: 'Environment not found' });
      }
      
      // Check if user has access to this environment
      if (req.user && environment.organizationId !== req.user.organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Don't allow deleting the default environment
      if (environment.isDefault) {
        return res.status(400).json({ error: 'Cannot delete default environment' });
      }
      
      const success = await environmentStore.deleteEnvironment(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete environment' });
    }
  });

  // Get environment variables
  router.get('/:id/variables', async (req, res) => {
    try {
      const variables = await environmentStore.getEnvironmentVariables(req.params.id);
      res.json(variables);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get environment variables' });
    }
  });

  // Set environment variable
  router.put('/:id/variables/:key', async (req, res) => {
    try {
      const { value, isSecret } = req.body;
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
  router.delete('/:id/variables/:key', async (req, res) => {
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

  // Export environment
  router.get('/:id/export', async (req, res) => {
    try {
      const environmentId = req.params.id;
      const environment = await environmentStore.getEnvironment(environmentId);
      if (!environment) {
        return res.status(404).json({ error: 'Environment not found' });
      }

      const variables = await environmentStore.getEnvironmentVariables(environmentId);

      const exportData = {
        environment,
        variables,
        exportDate: new Date(),
        version: '1.0'
      };

      res.json(exportData);
    } catch (error) {
      console.error('Failed to export environment:', error);
      res.status(500).json({ error: 'Failed to export environment' });
    }
  });

  // Import environment
  router.post('/:id/import', async (req, res) => {
    try {
      const environmentId = req.params.id;
      const { variables } = req.body;

      if (!variables || !Array.isArray(variables)) {
        return res.status(400).json({ error: 'Invalid import data: variables array required' });
      }

      const environment = await environmentStore.getEnvironment(environmentId);
      if (!environment) {
        return res.status(404).json({ error: 'Environment not found' });
      }

      // Import variables
      const importedVariables = [];
      for (const variableData of variables) {
        const variable = await environmentStore.setEnvironmentVariable(
          environmentId,
          variableData.key,
          variableData.value,
          variableData.isSecret || false
        );
        importedVariables.push(variable);
      }

      res.json({
        message: 'Environment imported successfully',
        importedVariables: importedVariables.length
      });
    } catch (error) {
      console.error('Failed to import environment:', error);
      res.status(500).json({ error: 'Failed to import environment' });
    }
  });

  // Duplicate environment
  router.post('/:id/duplicate', async (req, res) => {
    try {
      const sourceEnv = await environmentStore.getEnvironment(req.params.id);
      if (!sourceEnv) {
        return res.status(404).json({ error: 'Environment not found' });
      }

      // Create new environment with "(Copy)" suffix
      const newEnv = await environmentStore.createEnvironment({
        organizationId: sourceEnv.organizationId,
        name: `${sourceEnv.name} (Copy)`,
        description: sourceEnv.description,
        isDefault: false
      });

      // Copy all variables from source environment
      const variables = await environmentStore.getEnvironmentVariables(req.params.id);
      for (const variable of variables) {
        await environmentStore.setEnvironmentVariable(
          newEnv.id,
          variable.key,
          variable.value,
          variable.isSecret
        );
      }

      res.status(201).json(newEnv);
    } catch (error) {
      res.status(500).json({ error: 'Failed to duplicate environment' });
    }
  });

  return router;
};