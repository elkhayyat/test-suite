"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.environmentRoutes = void 0;
const express_1 = require("express");
const environmentRoutes = (environmentStore) => {
    const router = (0, express_1.Router)();
    // Get all environments
    router.get('/', async (req, res) => {
        try {
            const environments = await environmentStore.getEnvironments();
            res.json(environments);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to get environments' });
        }
    });
    // Get single environment
    router.get('/:id', async (req, res) => {
        try {
            const environment = await environmentStore.getEnvironment(req.params.id);
            if (!environment) {
                return res.status(404).json({ error: 'Environment not found' });
            }
            res.json(environment);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to get environment' });
        }
    });
    // Create environment
    router.post('/', async (req, res) => {
        try {
            const environment = await environmentStore.createEnvironment(req.body);
            res.status(201).json(environment);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to create environment' });
        }
    });
    // Update environment
    router.put('/:id', async (req, res) => {
        try {
            const environment = await environmentStore.updateEnvironment(req.params.id, req.body);
            if (!environment) {
                return res.status(404).json({ error: 'Environment not found' });
            }
            res.json(environment);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to update environment' });
        }
    });
    // Delete environment
    router.delete('/:id', async (req, res) => {
        try {
            const success = await environmentStore.deleteEnvironment(req.params.id);
            if (!success) {
                return res.status(404).json({ error: 'Environment not found' });
            }
            res.status(204).send();
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to delete environment' });
        }
    });
    // Get environment variables
    router.get('/:id/variables', async (req, res) => {
        try {
            const variables = await environmentStore.getEnvironmentVariables(req.params.id);
            res.json(variables);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to get environment variables' });
        }
    });
    // Set environment variable
    router.put('/:id/variables/:key', async (req, res) => {
        try {
            const { value, isSecret } = req.body;
            const variable = await environmentStore.setEnvironmentVariable(req.params.id, req.params.key, value, isSecret);
            res.json(variable);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to set environment variable' });
        }
    });
    // Delete environment variable
    router.delete('/:id/variables/:key', async (req, res) => {
        try {
            const success = await environmentStore.deleteEnvironmentVariable(req.params.id, req.params.key);
            if (!success) {
                return res.status(404).json({ error: 'Variable not found' });
            }
            res.status(204).send();
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to delete environment variable' });
        }
    });
    return router;
};
exports.environmentRoutes = environmentRoutes;
//# sourceMappingURL=environments-mongo.js.map