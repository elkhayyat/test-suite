import { v4 as uuidv4 } from 'uuid';
import { TestFlow } from '../../../shared/src/types';
import { sampleFlows } from './SampleFlows';
import { getDatabase } from '../db/database';

export class FlowStore {
  private flows: Map<string, TestFlow> = new Map();

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      // Load flows from database
      await this.loadFlowsFromDatabase();
      
      // If no flows exist, load sample flows
      if (this.flows.size === 0) {
        for (const flow of sampleFlows) {
          await this.createFlow(flow);
        }
      }
    } catch (error) {
      console.error('Failed to initialize flow store:', error);
      // Fallback to sample flows
      sampleFlows.forEach(flow => {
        this.flows.set(flow.id, flow);
      });
    }
  }

  private async loadFlowsFromDatabase() {
    try {
      const db = await getDatabase();
      const rows = await db.all('SELECT * FROM flows');
      
      rows.forEach(row => {
        const flow: TestFlow = {
          id: row.id,
          projectId: row.project_id,
          folderId: row.folder_id,
          name: row.name,
          description: row.description,
          steps: JSON.parse(row.nodes),
          connections: JSON.parse(row.edges),
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
        };
        this.flows.set(flow.id, flow);
      });
    } catch (error) {
      console.error('Failed to load flows from database:', error);
    }
  }

  getAllFlows(): TestFlow[] {
    return Array.from(this.flows.values());
  }

  getFlowsByProject(projectId: string): TestFlow[] {
    return Array.from(this.flows.values()).filter(flow => flow.projectId === projectId);
  }

  getFlowsByFolder(folderId: string): TestFlow[] {
    return Array.from(this.flows.values()).filter(flow => flow.folderId === folderId);
  }

  getFlow(id: string): TestFlow | undefined {
    return this.flows.get(id);
  }

  async createFlow(data: Partial<TestFlow>): Promise<TestFlow> {
    const flow: TestFlow = {
      id: data.id || uuidv4(),
      projectId: data.projectId || 'default',
      folderId: data.folderId,
      name: data.name || 'Untitled Flow',
      description: data.description,
      steps: data.steps || [],
      connections: data.connections || [],
      createdAt: data.createdAt || new Date(),
      updatedAt: data.updatedAt || new Date(),
    };
    
    // Save to database
    try {
      const db = await getDatabase();
      await db.run(
        `INSERT INTO flows (id, project_id, folder_id, name, description, nodes, edges, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        flow.id,
        flow.projectId,
        flow.folderId || null,
        flow.name,
        flow.description,
        JSON.stringify(flow.steps),
        JSON.stringify(flow.connections),
        flow.createdAt.toISOString(),
        flow.updatedAt.toISOString()
      );
    } catch (error) {
      console.error('Failed to save flow to database:', error);
    }
    
    this.flows.set(flow.id, flow);
    return flow;
  }

  async updateFlow(id: string, data: Partial<TestFlow>): Promise<TestFlow | undefined> {
    const flow = this.flows.get(id);
    if (!flow) return undefined;

    const updatedFlow: TestFlow = {
      ...flow,
      ...data,
      id,
      updatedAt: new Date(),
    };

    // Update in database
    try {
      const db = await getDatabase();
      await db.run(
        `UPDATE flows 
         SET project_id = ?, folder_id = ?, name = ?, description = ?, nodes = ?, edges = ?, updated_at = ?
         WHERE id = ?`,
        updatedFlow.projectId,
        updatedFlow.folderId || null,
        updatedFlow.name,
        updatedFlow.description,
        JSON.stringify(updatedFlow.steps),
        JSON.stringify(updatedFlow.connections),
        updatedFlow.updatedAt.toISOString(),
        id
      );
    } catch (error) {
      console.error('Failed to update flow in database:', error);
    }

    this.flows.set(id, updatedFlow);
    return updatedFlow;
  }

  async deleteFlow(id: string): Promise<boolean> {
    // Delete from database
    try {
      const db = await getDatabase();
      await db.run('DELETE FROM flows WHERE id = ?', id);
    } catch (error) {
      console.error('Failed to delete flow from database:', error);
    }
    
    return this.flows.delete(id);
  }
}