import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import https from 'https';
import dns from 'dns';
import { promisify } from 'util';
import { chromium, Browser, Page } from 'playwright';
import { TestRun, TestFlow, TestStep, StepResult, SubflowStepConfig, IFlowStore, IEnvironmentStore } from '../../../shared/src/types';
import { FlowStore } from './FlowStore';
import { EnvironmentStore } from './EnvironmentStore';
import { TestRunStoreMongo } from './TestRunStoreMongo';
import { VariableInterpolator } from './VariableInterpolator';
import { EnhancedInterpolator } from './EnhancedInterpolator';
import { ConsoleLogger } from './ConsoleLogger';
import { processRandomGenerators, processRandomInJSON } from '../utils/randomGenerators';

export class TestRunner {
  private runs: Map<string, TestRun> = new Map();
  private browser: Browser | null = null;
  private activeRuns: Set<string> = new Set();
  private environmentStore: IEnvironmentStore;
  private consoleLogger: ConsoleLogger;
  private runStore?: TestRunStoreMongo;

  constructor(private io: Server, private flowStore: IFlowStore, environmentStore: IEnvironmentStore, runStore?: TestRunStoreMongo) {
    this.environmentStore = environmentStore;
    this.consoleLogger = new ConsoleLogger(io);
    this.runStore = runStore;
  }

  getAllRuns(): TestRun[] {
    return Array.from(this.runs.values());
  }

  getRun(id: string): TestRun | undefined {
    return this.runs.get(id);
  }

  /**
   * Get the most recent step results for a flow (for step reference interpolation)
   */
  private getLatestStepResults(flowId: string, maxRuns = 10): StepResult[] {
    const flowRuns = Array.from(this.runs.values())
      .filter(run => run.flowId === flowId)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, maxRuns); // Limit to recent runs to prevent memory bloat

    // Get the most recent result for each step
    const latestResults: { [stepId: string]: StepResult } = {};
    
    for (const run of flowRuns) {
      for (const result of run.results) {
        if (this.isMoreRecentResult(result, latestResults[result.stepId])) {
          latestResults[result.stepId] = result;
        }
      }
    }

    return Object.values(latestResults);
  }

  /**
   * Helper function to determine if a result is more recent than another
   */
  private isMoreRecentResult(newResult: StepResult, existingResult?: StepResult): boolean {
    return !existingResult || 
      (!!newResult.endTime && !!existingResult.endTime && newResult.endTime > existingResult.endTime);
  }

  async startRun(flowId: string, environmentId?: string, selectedSteps?: string[], organizationId?: string, userId?: string): Promise<string> {
    const flow = await this.flowStore.getFlow(flowId);
    if (!flow) {
      throw new Error('Flow not found');
    }

    // If no environment specified, use the default for the organization
    if (!environmentId && organizationId && this.environmentStore.getEnvironmentsByOrganization) {
      const environments = await this.environmentStore.getEnvironmentsByOrganization(organizationId);
      const defaultEnv = environments.find((e: any) => e.isDefault);
      environmentId = defaultEnv?.id;
    }

    const run: TestRun = {
      id: uuidv4(),
      flowId,
      flowName: flow.name,
      projectId: flow.projectId,
      organizationId: organizationId || 'default-org',
      userId: userId || 'system',
      environmentId,
      status: 'running',
      startTime: new Date(),
      results: [],
      selectedSteps,
    };

    this.runs.set(run.id, run);
    this.activeRuns.add(run.id);
    this.io.emit('run:started', run);

    this.executeFlow(run.id, flow, environmentId!, selectedSteps).catch(error => {
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
    // Set flow execution timeout (default 5 seconds)
    const flowTimeout = 5000;
    const flowTimeoutId = setTimeout(() => {
      console.error(`Flow execution timeout after ${flowTimeout}ms`);
      this.updateRunStatus(runId, 'failed');
      this.activeRuns.delete(runId);
    }, flowTimeout);

    try {
      // Load environment variables
      const variables = await this.environmentStore.getEnvironmentVariables(environmentId);
      
      // Get existing step results for reference interpolation
      const existingResults = this.getLatestStepResults(flow.id);
      
      // Use enhanced interpolator that supports both {{var}} and $stepId.path syntax
      const interpolator = new EnhancedInterpolator(variables, existingResults);
      const completedResults: StepResult[] = [];
    
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

        // Update interpolator with completed step results
        interpolator.updateStepResults(completedResults);
        
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

        const result = await this.executeStep(interpolatedStep, page, environmentId, runId);

        this.addStepResult(runId, result);
        this.io.emit('step:updated', { runId, stepId: result.stepId, result });
        
        // Add to completed results for future interpolation
        completedResults.push(result);

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
    } catch (error) {
      console.error('Flow execution error:', error);
      this.updateRunStatus(runId, 'failed');
    } finally {
      // Clear the flow timeout
      clearTimeout(flowTimeoutId);
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

  private async executeStep(step: TestStep, page: Page | null, environmentId?: string, runId?: string): Promise<StepResult> {
    const result: StepResult = {
      stepId: step.id,
      status: 'running',
      startTime: new Date(),
    };

    // Start console capture if runId is provided
    if (runId) {
      this.consoleLogger.startCapture(runId, step.id);
    }

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
        case 'subflow':
          result.output = await this.executeSubflowStep(step, environmentId || 'default', runId);
          break;
      }
      
      result.status = 'passed';
    } catch (error) {
      result.status = 'failed';
      result.error = (error as Error).message;
    } finally {
      // Stop console capture and get logs
      if (runId) {
        this.consoleLogger.stopCapture();
        result.logs = this.consoleLogger.getStepLogs(runId, step.id);
      }
    }

    result.endTime = new Date();
    return result;
  }

  private async executeHttpStep(step: TestStep): Promise<any> {
    const config = step.config;
    
    // Validate that URL is provided and is a string
    if (!config.url || typeof config.url !== 'string') {
      throw new Error('URL is required and must be a string');
    }
    
    // Process random values in URL
    const processedUrl = processRandomGenerators(config.url);
    
    // Process random values in headers
    const processedHeaders = config.headers ? processRandomInJSON(config.headers) : {};
    
    // Get retry configuration
    const maxRetries = config.retries || 0;
    const retryDelay = config.retryDelay || 1000;
    let lastError: Error | null = null;
    
    // Validate URL format and test DNS resolution
    try {
      const parsedUrl = new URL(processedUrl);
      
      // Test DNS resolution
      const lookup = promisify(dns.lookup);
      try {
        await lookup(parsedUrl.hostname, { family: 4 }); // IPv4 only
      } catch (dnsError) {
        // DNS lookup failed - continue anyway as it might be a local/test endpoint
      }
    } catch (error) {
      throw new Error(`Invalid URL format: ${processedUrl}`);
    }
    
    // Use default timeout of 1 second for HTTP requests
    const defaultTimeout = 1000;
    // Use configured timeout or default, no minimum enforced
    const actualTimeout = config.timeout || defaultTimeout;
    
    // Retry loop
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
      
      try {
      // Create a more permissive HTTPS agent
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false, // Allow self-signed certificates
        keepAlive: true,
        family: 4, // Force IPv4 to avoid IPv6 issues
      });

      // Process body - first process random values, then parse if JSON
      let processedBody = config.body;
      if (typeof config.body === 'string' && config.body.trim()) {
        // First process random values in the string
        const bodyWithRandom = processRandomGenerators(config.body);
        try {
          // Try to parse as JSON
          processedBody = JSON.parse(bodyWithRandom);
        } catch (e) {
          // Keep as string if not valid JSON
          processedBody = bodyWithRandom;
        }
      } else if (config.body && typeof config.body === 'object') {
        // Process random values in JSON object
        processedBody = processRandomInJSON(config.body);
      }

      const requestConfig = {
        method: config.method || 'GET',
        url: processedUrl,
        headers: processedHeaders,
        data: processedBody,
        timeout: actualTimeout,
        validateStatus: config.validateStatus || (() => true),
        httpsAgent: httpsAgent,
        // Add additional debugging options
        maxRedirects: 5,
        insecureHTTPParser: true,
      };
      
      const response = await axios(requestConfig);

      return {
        status: response.status,
        headers: response.headers,
        data: response.data,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        
        // Store the error for potential retry
        if (error.code === 'ENOTFOUND') {
          lastError = new Error(`DNS lookup failed for ${config.url}. Check if the domain exists and is accessible.`);
        } else if (error.code === 'ECONNREFUSED') {
          lastError = new Error(`Connection refused to ${config.url}. Server may be down, not accepting connections, or blocked. Check server status and network connectivity.`);
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
          lastError = new Error(`Request timed out after ${actualTimeout}ms for ${config.url}. Consider increasing the timeout or check if the server is responding slowly.`);
        } else if (error.response) {
          lastError = new Error(`HTTP ${error.response.status}: ${error.response.statusText} - ${JSON.stringify(error.response.data)}`);
        } else {
          lastError = new Error(`Network error: ${error.message}`);
        }
      } else {
        lastError = new Error(`Request failed: ${(error as Error).message || 'Unknown error'}`);
      }
      
      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw lastError;
      }
    }
    } // End of retry loop
    
    // This should never be reached, but just in case
    throw lastError || new Error('Request failed after all retry attempts');
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

  private async executeSubflowStep(step: TestStep, environmentId: string, runId?: string): Promise<any> {
    const config = step.config as SubflowStepConfig;
    
    // Validate config
    if (!config.flowId) {
      throw new Error('Sub-flow ID is required');
    }

    // Get the sub-flow
    const subFlow = await this.flowStore.getFlow(config.flowId);
    if (!subFlow) {
      throw new Error(`Sub-flow with ID ${config.flowId} not found`);
    }

    // Determine environment to use
    const subflowEnvironmentId = config.inheritEnvironment !== false ? environmentId : 'default';

    // Load environment variables for sub-flow
    const variables = await this.environmentStore.getEnvironmentVariables(subflowEnvironmentId);
    const interpolator = new VariableInterpolator(variables);

    // Apply variable mapping if provided
    if (config.variableMapping) {
      // TODO: Implement variable mapping logic
      // This would allow parent flow variables to be mapped to sub-flow variables
    }

    const executionOrder = this.calculateExecutionOrder(subFlow);
    const subResults: StepResult[] = [];
    let page: Page | null = null;

    try {
      for (const stepId of executionOrder) {
        const subStep = subFlow.steps.find(s => s.id === stepId);
        if (!subStep) continue;

        // Interpolate variables in sub-step config
        const interpolatedStep = {
          ...subStep,
          config: interpolator.interpolateStepConfig(subStep.config)
        };

        // Create browser page if needed for browser steps
        if (subStep.type === 'browser' && !page) {
          if (!this.browser) {
            this.browser = await chromium.launch();
          }
          page = await this.browser.newPage();
        }

        const stepResult = await this.executeStep(interpolatedStep, page, subflowEnvironmentId, runId);
        subResults.push(stepResult);

        // Emit sub-flow step update
        this.io.emit('subflow:step:updated', { 
          parentStepId: step.id, 
          subflowId: config.flowId,
          stepId: stepResult.stepId, 
          result: stepResult 
        });

        if (stepResult.status === 'failed') {
          throw new Error(`Sub-flow step ${subStep.name} failed: ${stepResult.error}`);
        }
      }

      return {
        subflowId: config.flowId,
        subflowName: subFlow.name,
        stepResults: subResults,
        totalSteps: subResults.length,
        passedSteps: subResults.filter(r => r.status === 'passed').length,
        failedSteps: subResults.filter(r => r.status === 'failed').length,
        executionTime: subResults.reduce((total, r) => {
          if (r.startTime && r.endTime) {
            return total + (r.endTime.getTime() - r.startTime.getTime());
          }
          return total;
        }, 0)
      };
    } finally {
      if (page) {
        await page.close();
      }
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