import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { chromium, Browser, Page } from 'playwright';
import { TestRun, TestFlow, TestStep, StepResult } from '../../../shared/src/types';
import { FlowStore } from './FlowStore';
import { EnvironmentStore } from './EnvironmentStore';
import { VariableInterpolator } from './VariableInterpolator';

export class TestRunner {
  private runs: Map<string, TestRun> = new Map();
  private browser: Browser | null = null;
  private activeRuns: Set<string> = new Set();
  private environmentStore: EnvironmentStore;

  constructor(private io: Server, private flowStore: FlowStore) {
    this.environmentStore = new EnvironmentStore();
  }

  getAllRuns(): TestRun[] {
    return Array.from(this.runs.values());
  }

  getRun(id: string): TestRun | undefined {
    return this.runs.get(id);
  }

  async startRun(flowId: string, environmentId?: string): Promise<string> {
    const flow = this.flowStore.getFlow(flowId);
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

    this.executeFlow(run.id, flow, environmentId).catch(error => {
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

  private async executeFlow(runId: string, flow: TestFlow, environmentId: string) {
    // Load environment variables
    const variables = await this.environmentStore.getEnvironmentVariables(environmentId);
    const interpolator = new VariableInterpolator(variables);
    
    const executionOrder = this.calculateExecutionOrder(flow);
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

        const result = await this.executeStep(interpolatedStep, page);
        
        if (step.type === 'browser' && !page && this.browser) {
          page = await this.browser.newPage();
        }

        this.addStepResult(runId, result);
        this.io.emit('step:completed', { runId, result });

        if (result.status === 'failed') {
          this.updateRunStatus(runId, 'failed');
          break;
        }
      }

      if (this.activeRuns.has(runId)) {
        this.updateRunStatus(runId, 'completed');
      }
    } finally {
      if (page) {
        await page.close();
      }
      this.activeRuns.delete(runId);
    }
  }

  private calculateExecutionOrder(flow: TestFlow): string[] {
    const visited = new Set<string>();
    const order: string[] = [];
    const adjacencyList = new Map<string, string[]>();

    flow.connections.forEach(conn => {
      if (!adjacencyList.has(conn.source)) {
        adjacencyList.set(conn.source, []);
      }
      adjacencyList.get(conn.source)!.push(conn.target);
    });

    const dfs = (stepId: string) => {
      if (visited.has(stepId)) return;
      visited.add(stepId);
      
      const neighbors = adjacencyList.get(stepId) || [];
      neighbors.forEach(neighbor => dfs(neighbor));
      
      order.unshift(stepId);
    };

    flow.steps.forEach(step => {
      if (!visited.has(step.id)) {
        dfs(step.id);
      }
    });

    return order.reverse();
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
    const response = await axios({
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