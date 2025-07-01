import { v4 as uuidv4 } from 'uuid';
import { TestFlow, IFlowStore } from '../../../shared/src/types';
import { sampleFlows } from './SampleFlows';
import { MongoDB } from '../db/mongodb';

export class FlowStore implements IFlowStore {
  private mongodb: MongoDB;
  public flows: Map<string, TestFlow> = new Map();

  constructor(mongodb: MongoDB) {
    this.mongodb = mongodb;
    this.initialize();
  }

  private async initialize() {
    try {
      // Load flows from database
      await this.loadFlowsFromDatabase();
      
      const collections = this.mongodb.getCollections();
      
      // Check if we have any flows
      const flowCount = await collections.flows.countDocuments();
      
      // If no flows exist, load sample flows
      if (flowCount === 0) {
        for (const flow of sampleFlows) {
          await this.createFlow(flow);
        }
      }
    } catch (error) {
      console.error('Failed to initialize flow store:', error);
    }
  }

  async loadFlowsFromDatabase(): Promise<void> {
    try {
      const collections = this.mongodb.getCollections();
      const flows = await collections.flows.find({}).toArray();
      this.flows.clear();
      flows.forEach(flow => {
        this.flows.set(flow.id, flow);
      });
      console.log(`Loaded ${flows.length} flows from database`);
    } catch (error) {
      console.error('Failed to load flows from database:', error);
    }
  }

  async getAllFlows(): Promise<TestFlow[]> {
    try {
      const collections = this.mongodb.getCollections();
      const flows = await collections.flows.find({}).toArray();
      console.log(`Retrieved ${flows.length} flows from database`);
      return flows;
    } catch (error) {
      console.error('Failed to get all flows:', error);
      return [];
    }
  }

  async getFlowsByProject(projectId: string): Promise<TestFlow[]> {
    try {
      const collections = this.mongodb.getCollections();
      const flows = await collections.flows.find({ projectId }).toArray();
      return flows;
    } catch (error) {
      console.error('Failed to get flows by project:', error);
      return [];
    }
  }

  async getFlowsByFolder(folderId: string): Promise<TestFlow[]> {
    try {
      const collections = this.mongodb.getCollections();
      const flows = await collections.flows.find({ folderId }).toArray();
      return flows;
    } catch (error) {
      console.error('Failed to get flows by folder:', error);
      return [];
    }
  }

  async getFlow(id: string): Promise<TestFlow | undefined> {
    try {
      const collections = this.mongodb.getCollections();
      const flow = await collections.flows.findOne({ id });
      return flow || undefined;
    } catch (error) {
      console.error('Failed to get flow:', error);
      return undefined;
    }
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
    
    try {
      console.log('Creating flow:', { id: flow.id, name: flow.name, projectId: flow.projectId });
      const collections = this.mongodb.getCollections();
      await collections.flows.insertOne(flow);
      console.log('Flow created successfully:', flow.id);
      
      // Verify the flow was saved
      const savedFlow = await collections.flows.findOne({ id: flow.id });
      if (!savedFlow) {
        console.error('Flow was not saved properly!');
        throw new Error('Flow was not saved properly');
      }
    } catch (error) {
      console.error('Failed to save flow to database:', error);
      throw error;
    }
    
    return flow;
  }

  async updateFlow(id: string, data: Partial<TestFlow>): Promise<TestFlow | undefined> {
    try {
      const collections = this.mongodb.getCollections();
      
      // First check if the flow exists
      const existingFlow = await collections.flows.findOne({ id });
      if (!existingFlow) {
        console.error(`Flow with id ${id} not found`);
        return undefined;
      }
      
      const updatedFlow = {
        ...data,
        updatedAt: new Date(),
      };
      
      // Remove id from update data to avoid overwriting it
      delete updatedFlow.id;
      
      console.log(`Updating flow ${id} with data:`, updatedFlow);
      
      const result = await collections.flows.findOneAndUpdate(
        { id },
        { $set: updatedFlow },
        { returnDocument: 'after' }
      );
      
      if (!result) {
        console.error(`Failed to update flow ${id} - no result returned`);
      }
      
      return result || undefined;
    } catch (error) {
      console.error('Failed to update flow in database:', error);
      return undefined;
    }
  }

  async deleteFlow(id: string): Promise<boolean> {
    try {
      const collections = this.mongodb.getCollections();
      const result = await collections.flows.deleteOne({ id });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Failed to delete flow from database:', error);
      return false;
    }
  }
}