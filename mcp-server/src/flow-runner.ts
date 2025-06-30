import { ApiClient } from './api-client.js';
import type { TestRun } from '../../shared/src/types.js';

interface RunOptions {
  environmentId?: string;
  parallel?: boolean;
  selectedSteps?: string[];
}

export class FlowRunner {
  constructor(private apiClient: ApiClient) {}

  async runFlow(flowId: string, options?: RunOptions): Promise<TestRun> {
    // Run a single flow
    const testRun = await this.apiClient.runFlow(flowId, {
      environmentId: options?.environmentId,
      selectedSteps: options?.selectedSteps,
    });

    // Wait for completion
    return await this.waitForCompletion(testRun.id);
  }

  async runFolder(folderId: string, options?: RunOptions): Promise<TestRun[]> {
    // Get all flows in the folder
    const flows = await this.apiClient.getFlowsByFolder(folderId);
    
    if (flows.length === 0) {
      throw new Error(`No flows found in folder ${folderId}`);
    }

    // Run flows
    if (options?.parallel) {
      return await this.runFlowsParallel(flows.map(f => f.id), options);
    } else {
      return await this.runFlowsSequential(flows.map(f => f.id), options);
    }
  }

  async runProject(projectId: string, options?: RunOptions): Promise<TestRun[]> {
    // Get all flows in the project
    const flows = await this.apiClient.getFlowsByProject(projectId);
    
    if (flows.length === 0) {
      throw new Error(`No flows found in project ${projectId}`);
    }

    // Run flows
    if (options?.parallel) {
      return await this.runFlowsParallel(flows.map(f => f.id), options);
    } else {
      return await this.runFlowsSequential(flows.map(f => f.id), options);
    }
  }

  private async runFlowsSequential(flowIds: string[], options?: RunOptions): Promise<TestRun[]> {
    const results: TestRun[] = [];
    
    for (const flowId of flowIds) {
      try {
        const result = await this.runFlow(flowId, options);
        results.push(result);
      } catch (error) {
        // Create a failed test run result
        results.push({
          id: 'error-' + flowId,
          flowId,
          organizationId: '',
          userId: '',
          status: 'failed',
          startTime: new Date(),
          endTime: new Date(),
          results: [],
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    return results;
  }

  private async runFlowsParallel(flowIds: string[], options?: RunOptions): Promise<TestRun[]> {
    const promises = flowIds.map(flowId => 
      this.runFlow(flowId, options).catch(error => ({
        id: 'error-' + flowId,
        flowId,
        organizationId: '',
        userId: '',
        status: 'failed' as const,
        startTime: new Date(),
        endTime: new Date(),
        results: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      }))
    );
    
    return await Promise.all(promises);
  }

  private async waitForCompletion(testRunId: string, maxWaitTime = 300000): Promise<TestRun> {
    const startTime = Date.now();
    const pollInterval = 1000; // 1 second

    while (Date.now() - startTime < maxWaitTime) {
      const testRun = await this.apiClient.getTestRun(testRunId);
      
      if (testRun.status === 'completed' || testRun.status === 'failed') {
        return testRun;
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    throw new Error(`Test run ${testRunId} did not complete within ${maxWaitTime}ms`);
  }
}