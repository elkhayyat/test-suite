"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runRoutes = void 0;
const express_1 = require("express");
const runRoutes = (testRunner) => {
    const router = (0, express_1.Router)();
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
        const { flowId, environmentId } = req.body;
        if (!flowId) {
            return res.status(400).json({ error: 'flowId is required' });
        }
        try {
            const runId = await testRunner.startRun(flowId, environmentId);
            res.status(201).json({ runId });
        }
        catch (error) {
            res.status(400).json({ error: error.message });
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
exports.runRoutes = runRoutes;
//# sourceMappingURL=runs.js.map