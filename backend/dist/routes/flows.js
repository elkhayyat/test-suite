"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flowRoutes = exports.flowStore = void 0;
const express_1 = require("express");
const FlowStore_1 = require("../services/FlowStore");
exports.flowStore = new FlowStore_1.FlowStore();
exports.flowRoutes = (0, express_1.Router)();
exports.flowRoutes.get('/', (req, res) => {
    const flows = exports.flowStore.getAllFlows();
    res.json(flows);
});
exports.flowRoutes.get('/:id', (req, res) => {
    const flow = exports.flowStore.getFlow(req.params.id);
    if (!flow) {
        return res.status(404).json({ error: 'Flow not found' });
    }
    res.json(flow);
});
exports.flowRoutes.post('/', async (req, res) => {
    const flow = await exports.flowStore.createFlow(req.body);
    res.status(201).json(flow);
});
exports.flowRoutes.put('/:id', async (req, res) => {
    const flow = await exports.flowStore.updateFlow(req.params.id, req.body);
    if (!flow) {
        return res.status(404).json({ error: 'Flow not found' });
    }
    res.json(flow);
});
exports.flowRoutes.delete('/:id', async (req, res) => {
    const success = await exports.flowStore.deleteFlow(req.params.id);
    if (!success) {
        return res.status(404).json({ error: 'Flow not found' });
    }
    res.status(204).send();
});
//# sourceMappingURL=flows.js.map