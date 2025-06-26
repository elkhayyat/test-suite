"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestRunner = void 0;
const uuid_1 = require("uuid");
const axios_1 = __importDefault(require("axios"));
const playwright_1 = require("playwright");
const EnvironmentStore_1 = require("./EnvironmentStore");
const VariableInterpolator_1 = require("./VariableInterpolator");
class TestRunner {
    io;
    flowStore;
    runs = new Map();
    browser = null;
    activeRuns = new Set();
    environmentStore;
    constructor(io, flowStore) {
        this.io = io;
        this.flowStore = flowStore;
        this.environmentStore = new EnvironmentStore_1.EnvironmentStore();
    }
    getAllRuns() {
        return Array.from(this.runs.values());
    }
    getRun(id) {
        return this.runs.get(id);
    }
    async startRun(flowId, environmentId, selectedSteps) {
        const flow = await this.flowStore.getFlow(flowId);
        if (!flow) {
            throw new Error('Flow not found');
        }
        // If no environment specified, use the default
        if (!environmentId) {
            const environments = await this.environmentStore.getEnvironments();
            const defaultEnv = environments.find(e => e.isDefault);
            environmentId = defaultEnv?.id || 'default';
        }
        const run = {
            id: (0, uuid_1.v4)(),
            flowId,
            environmentId,
            status: 'running',
            startTime: new Date(),
            results: [],
        };
        this.runs.set(run.id, run);
        this.activeRuns.add(run.id);
        this.io.emit('run:started', run);
        this.executeFlow(run.id, flow, environmentId, selectedSteps).catch(error => {
            console.error('Flow execution error:', error);
            this.updateRunStatus(run.id, 'failed');
        });
        return run.id;
    }
    stopRun(runId) {
        if (!this.activeRuns.has(runId)) {
            return false;
        }
        this.activeRuns.delete(runId);
        this.updateRunStatus(runId, 'failed');
        return true;
    }
    async executeFlow(runId, flow, environmentId, selectedSteps) {
        // Load environment variables
        const variables = await this.environmentStore.getEnvironmentVariables(environmentId);
        const interpolator = new VariableInterpolator_1.VariableInterpolator(variables);
        let executionOrder = this.calculateExecutionOrder(flow);
        // If selectedSteps is provided, filter to only run those steps
        if (selectedSteps && selectedSteps.length > 0) {
            executionOrder = executionOrder.filter(stepId => selectedSteps.includes(stepId));
        }
        let page = null;
        try {
            for (const stepId of executionOrder) {
                if (!this.activeRuns.has(runId)) {
                    break;
                }
                const step = flow.steps.find(s => s.id === stepId);
                if (!step)
                    continue;
                // Interpolate variables in step config
                const interpolatedStep = {
                    ...step,
                    config: interpolator.interpolateStepConfig(step.config)
                };
                // Create browser page if needed for browser steps
                if (step.type === 'browser' && !page) {
                    if (!this.browser) {
                        this.browser = await playwright_1.chromium.launch();
                    }
                    page = await this.browser.newPage();
                }
                const result = await this.executeStep(interpolatedStep, page);
                this.addStepResult(runId, result);
                this.io.emit('step:updated', { runId, stepId: result.stepId, result });
                if (result.status === 'failed') {
                    this.updateRunStatus(runId, 'failed');
                    break;
                }
            }
            if (this.activeRuns.has(runId)) {
                // Check if any step failed
                const run = this.runs.get(runId);
                const hasFailed = run?.results?.some(r => r.status === 'failed');
                this.updateRunStatus(runId, hasFailed ? 'failed' : 'completed');
            }
        }
        finally {
            if (page) {
                await page.close();
            }
            this.activeRuns.delete(runId);
        }
    }
    calculateExecutionOrder(flow) {
        // If no connections exist, execute all steps in order
        if (flow.connections.length === 0) {
            return flow.steps.map(step => step.id);
        }
        // Use Kahn's algorithm for topological sorting
        const inDegree = new Map();
        const adjacencyList = new Map();
        const order = [];
        // Initialize in-degree for all steps
        flow.steps.forEach(step => {
            inDegree.set(step.id, 0);
            adjacencyList.set(step.id, []);
        });
        // Build adjacency list and calculate in-degrees
        flow.connections.forEach(conn => {
            adjacencyList.get(conn.source).push(conn.target);
            inDegree.set(conn.target, (inDegree.get(conn.target) || 0) + 1);
        });
        // Find all nodes with no incoming edges
        const queue = [];
        inDegree.forEach((degree, stepId) => {
            if (degree === 0) {
                queue.push(stepId);
            }
        });
        // Process queue
        while (queue.length > 0) {
            const current = queue.shift();
            order.push(current);
            // For each neighbor of current node
            const neighbors = adjacencyList.get(current) || [];
            neighbors.forEach(neighbor => {
                // Decrease in-degree by 1
                const newDegree = (inDegree.get(neighbor) || 0) - 1;
                inDegree.set(neighbor, newDegree);
                // If in-degree becomes 0, add to queue
                if (newDegree === 0) {
                    queue.push(neighbor);
                }
            });
        }
        // Check for circular dependencies
        if (order.length !== flow.steps.length) {
            throw new Error('Circular dependency detected in flow');
        }
        return order;
    }
    async executeStep(step, page) {
        const result = {
            stepId: step.id,
            status: 'running',
            startTime: new Date(),
        };
        try {
            switch (step.type) {
                case 'http':
                    result.output = await this.executeHttpStep(step);
                    break;
                case 'browser':
                    if (!this.browser) {
                        this.browser = await playwright_1.chromium.launch();
                    }
                    result.output = await this.executeBrowserStep(step, page);
                    break;
                case 'delay':
                    await this.executeDelayStep(step);
                    break;
                case 'assertion':
                    await this.executeAssertionStep(step, result);
                    break;
                case 'sql':
                    result.output = await this.executeSqlStep(step);
                    break;
            }
            result.status = 'passed';
        }
        catch (error) {
            result.status = 'failed';
            result.error = error.message;
        }
        result.endTime = new Date();
        return result;
    }
    async executeHttpStep(step) {
        const config = step.config;
        const response = await (0, axios_1.default)({
            method: config.method,
            url: config.url,
            headers: config.headers,
            data: config.body,
            timeout: config.timeout || 30000,
            validateStatus: config.validateStatus || (() => true),
        });
        return {
            status: response.status,
            headers: response.headers,
            data: response.data,
        };
    }
    async executeBrowserStep(step, page) {
        if (!page && this.browser) {
            page = await this.browser.newPage();
        }
        if (!page) {
            throw new Error('Browser page not initialized');
        }
        const config = step.config;
        switch (config.action) {
            case 'navigate':
                await page.goto(config.value);
                break;
            case 'click':
                await page.click(config.selector);
                break;
            case 'type':
                await page.fill(config.selector, config.value);
                break;
            case 'wait':
                await page.waitForSelector(config.selector, { timeout: config.timeout });
                break;
            case 'screenshot':
                const screenshot = await page.screenshot();
                return { screenshot: screenshot.toString('base64') };
        }
        return { success: true };
    }
    async executeDelayStep(step) {
        const duration = step.config.duration || 1000;
        await new Promise(resolve => setTimeout(resolve, duration));
    }
    async executeAssertionStep(step, result) {
        const config = step.config;
        switch (config.type) {
            case 'equals':
                if (config.source !== config.expected) {
                    throw new Error(`Expected ${config.expected} but got ${config.source}`);
                }
                break;
            case 'contains':
                if (!String(config.source).includes(config.expected)) {
                    throw new Error(`Expected to contain ${config.expected}`);
                }
                break;
            case 'custom':
                const fn = new Function('data', config.customScript);
                if (!fn(config.source)) {
                    throw new Error('Custom assertion failed');
                }
                break;
        }
    }
    async executeSqlStep(step) {
        const config = step.config;
        // Note: This is a simplified implementation. In production, you would want to:
        // 1. Support multiple database types (MySQL, PostgreSQL, SQL Server, etc.)
        // 2. Use proper connection pooling
        // 3. Handle prepared statements securely
        // 4. Support variable interpolation
        // For now, we'll return a mock result to demonstrate the functionality
        console.log('Executing SQL query:', {
            connectionString: config.connectionString,
            query: config.query,
            parameters: config.parameters
        });
        // Mock result
        return {
            rows: [
                { id: 1, name: 'Test Record 1', created_at: new Date() },
                { id: 2, name: 'Test Record 2', created_at: new Date() }
            ],
            rowCount: 2,
            executionTime: 45,
            query: config.query
        };
        // TODO: Implement actual SQL execution
        // Example implementation with pg (PostgreSQL):
        // const client = new Client({ connectionString: config.connectionString });
        // await client.connect();
        // try {
        //   const result = await client.query(config.query, Object.values(config.parameters || {}));
        //   return {
        //     rows: result.rows,
        //     rowCount: result.rowCount,
        //     executionTime: result.duration,
        //   };
        // } finally {
        //   await client.end();
        // }
    }
    addStepResult(runId, result) {
        const run = this.runs.get(runId);
        if (run) {
            run.results.push(result);
        }
    }
    updateRunStatus(runId, status) {
        const run = this.runs.get(runId);
        if (run) {
            run.status = status;
            if (status === 'completed' || status === 'failed') {
                run.endTime = new Date();
            }
            this.io.emit('run:updated', run);
        }
    }
}
exports.TestRunner = TestRunner;
//# sourceMappingURL=TestRunner.js.map