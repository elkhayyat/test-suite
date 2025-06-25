import { v4 as uuidv4 } from 'uuid';
import { TestFlow } from '../../../shared/src/types';

export class FlowStore {
  private flows: Map<string, TestFlow> = new Map();

  getAllFlows(): TestFlow[] {
    return Array.from(this.flows.values());
  }

  getFlow(id: string): TestFlow | undefined {
    return this.flows.get(id);
  }

  createFlow(data: Partial<TestFlow>): TestFlow {
    const flow: TestFlow = {
      id: uuidv4(),
      name: data.name || 'Untitled Flow',
      description: data.description,
      steps: data.steps || [],
      connections: data.connections || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.flows.set(flow.id, flow);
    return flow;
  }

  updateFlow(id: string, data: Partial<TestFlow>): TestFlow | undefined {
    const flow = this.flows.get(id);
    if (!flow) return undefined;

    const updatedFlow: TestFlow = {
      ...flow,
      ...data,
      id,
      updatedAt: new Date(),
    };

    this.flows.set(id, updatedFlow);
    return updatedFlow;
  }

  deleteFlow(id: string): boolean {
    return this.flows.delete(id);
  }
}