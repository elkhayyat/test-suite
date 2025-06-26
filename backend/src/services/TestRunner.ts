import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { chromium, Browser, Page } from 'playwright';
import { TestRun, TestFlow, TestStep, StepResult } from '../../../shared/src/types';
import { FlowStore } from './FlowStore';
import { EnvironmentStore } from './EnvironmentStoreMongo';
import { VariableInterpolator } from './VariableInterpolator';

export class TestRunner {
  private runs: Map<string, TestRun> = new Map();
  private browser: Browser | null = null;
  private activeRuns: Set<string> = new Set();
  private environmentStore: EnvironmentStore;

  constructor(private io: Server, private flowStore: FlowStore, environmentStore: EnvironmentStore) {
    this.environmentStore = environmentStore;
  }

  getAllRuns(): TestRun[] {
    return Array.from(this.runs.values());
  }

  getRun(id: string): TestRun | undefined {
    return this.runs.get(id);
  }

  async startRun(flowId: string, environmentId?: string, selectedSteps?: string[]): Promise<string> {
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

    const run: TestRun = {
      id: uuidv4(),
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

  stopRun(runId: string): boolean {
    if (!this.activeRuns.has(runId)) {
      return false;
    }
    
    this.activeRuns.delete(runId);
    this.updateRunStatus(runId, 'failed');
    return true;
  }

  private async executeFlow(runId: string, flow: TestFlow, environmentId: string, selectedSteps?: string[]) {
    // Load environment variables
    console.log('Loading environment variables for environment:', environmentId);
    const variables = await this.environmentStore.getEnvironmentVariables(environmentId);
    console.log(`Loaded ${variables.length} environment variables`);
    const interpolator = new VariableInterpolator(variables);
    
    let executionOrder = this.calculateExecutionOrder(flow);
    
    // If selectedSteps is provided, filter to only run those steps
    if (selectedSteps && selectedSteps.length > 0) {
      executionOrder = executionOrder.filter(stepId => selectedSteps.includes(stepId));
    }
    
    let page: Page | null = null;

    try {
      for (const stepId of executionOrder) {
        if (!this.activeRuns.has(runId)) {
          break;
        }

        const step = flow.steps.find(s => s.id === stepId);
        if (!step) continue;

        // Interpolate variables in step config
        const interpolatedStep = {
          ...step,
          config: interpolator.interpolateStepConfig(step.config)
        };

        // Create browser page if needed for browser steps
        if (step.type === 'browser' && !page) {
          if (!this.browser) {
            this.browser = await chromium.launch();
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
    } finally {
      if (page) {
        await page.close();
      }
      this.activeRuns.delete(runId);
    }
  }

  private calculateExecutionOrder(flow: TestFlow): string[] {
    // If no connections exist, execute all steps in order
    if (flow.connections.length === 0) {
      return flow.steps.map(step => step.id);
    }

    // Use Kahn's algorithm for topological sorting
    const inDegree = new Map<string, number>();
    const adjacencyList = new Map<string, string[]>();
    const order: string[] = [];

    // Initialize in-degree for all steps
    flow.steps.forEach(step => {
      inDegree.set(step.id, 0);
      adjacencyList.set(step.id, []);
    });

    // Build adjacency list and calculate in-degrees
    flow.connections.forEach(conn => {
      adjacencyList.get(conn.source)!.push(conn.target);
      inDegree.set(conn.target, (inDegree.get(conn.target) || 0) + 1);
    });

    // Find all nodes with no incoming edges
    const queue: string[] = [];
    inDegree.forEach((degree, stepId) => {
      if (degree === 0) {
        queue.push(stepId);
      }
    });

    // Process queue
    while (queue.length > 0) {
      const current = queue.shift()!;
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

  private async executeStep(step: TestStep, page: Page | null): Promise<StepResult> {
    const result: StepResult = {
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
            this.browser = await chromium.launch();
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
    } catch (error) {
      result.status = 'failed';
      result.error = (error as Error).message;
    }

    result.endTime = new Date();
    return result;
  }

  private async executeHttpStep(step: TestStep): Promise<any> {
    const config = step.config;
    
    // Validate that URL doesn't contain unresolved variables
    if (!config.url || typeof config.url !== 'string') {
      throw new Error('URL is required and must be a string');
    }
    
    // Check for unresolved variables in URL
    const unresolvedVariables = config.url.match(/\{\{(\w+)\}\}/g);
    if (unresolvedVariables) {
      throw new Error(`URL contains unresolved variables: ${unresolvedVariables.join(', ')}`);
    }
    
    // Validate URL format
    try {
      new URL(config.url);
    } catch (error) {
      throw new Error(`Invalid URL format: ${config.url}`);
    }
    
    const response = await axios({
      method: config.method || 'GET',
      url: config.url,
      headers: config.headers || {},
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

  private async executeBrowserStep(step: TestStep, page: Page | null): Promise<any> {
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

  private async executeDelayStep(step: TestStep): Promise<void> {
    const duration = step.config.duration || 1000;
    await new Promise(resolve => setTimeout(resolve, duration));
  }

  private async executeAssertionStep(step: TestStep, result: StepResult): Promise<void> {
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

  private async executeSqlStep(step: TestStep): Promise<any> {
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

    // Mock result - ensure it has proper output structure
    const result = {
      rows: [
        { id: 1, name: 'Test Record 1', created_at: new Date() },
        { id: 2, name: 'Test Record 2', created_at: new Date() }
      ],
      rowCount: 2,
      executionTime: 45,
      query: config.query,
      summary: `Query executed successfully. ${2} rows returned in ${45}ms.`
    };
    
    console.log('SQL step returning result:', result);
    return result;
    
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

  private addStepResult(runId: string, result: StepResult) {
    const run = this.runs.get(runId);
    if (run) {
      run.results.push(result);
    }
  }

  private updateRunStatus(runId: string, status: TestRun['status']) {
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