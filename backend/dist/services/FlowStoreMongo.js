"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlowStore = void 0;
const uuid_1 = require("uuid");
const SampleFlows_1 = require("./SampleFlows");
class FlowStore {
    mongodb;
    constructor(mongodb) {
        this.mongodb = mongodb;
        this.initialize();
    }
    async initialize() {
        try {
            const collections = this.mongodb.getCollections();
            // Check if we have any flows
            const flowCount = await collections.flows.countDocuments();
            // If no flows exist, load sample flows
            if (flowCount === 0) {
                for (const flow of SampleFlows_1.sampleFlows) {
                    await this.createFlow(flow);
                }
            }
        }
        catch (error) {
            console.error('Failed to initialize flow store:', error);
        }
    }
    async getAllFlows() {
        try {
            const collections = this.mongodb.getCollections();
            const flows = await collections.flows.find({}).toArray();
            console.log(`Retrieved ${flows.length} flows from database`);
            return flows;
        }
        catch (error) {
            console.error('Failed to get all flows:', error);
            return [];
        }
    }
    async getFlowsByProject(projectId) {
        try {
            const collections = this.mongodb.getCollections();
            const flows = await collections.flows.find({ projectId }).toArray();
            return flows;
        }
        catch (error) {
            console.error('Failed to get flows by project:', error);
            return [];
        }
    }
    async getFlowsByFolder(folderId) {
        try {
            const collections = this.mongodb.getCollections();
            const flows = await collections.flows.find({ folderId }).toArray();
            return flows;
        }
        catch (error) {
            console.error('Failed to get flows by folder:', error);
            return [];
        }
    }
    async getFlow(id) {
        try {
            const collections = this.mongodb.getCollections();
            const flow = await collections.flows.findOne({ id });
            return flow || undefined;
        }
        catch (error) {
            console.error('Failed to get flow:', error);
            return undefined;
        }
    }
    async createFlow(data) {
        const flow = {
            id: data.id || (0, uuid_1.v4)(),
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
        }
        catch (error) {
            console.error('Failed to save flow to database:', error);
            throw error;
        }
        return flow;
    }
    async updateFlow(id, data) {
        try {
            const collections = this.mongodb.getCollections();
            const updatedFlow = {
                ...data,
                updatedAt: new Date(),
            };
            // Remove id from update data to avoid overwriting it
            delete updatedFlow.id;
            const result = await collections.flows.findOneAndUpdate({ id }, { $set: updatedFlow }, { returnDocument: 'after' });
            return result || undefined;
        }
        catch (error) {
            console.error('Failed to update flow in database:', error);
            return undefined;
        }
    }
    async deleteFlow(id) {
        try {
            const collections = this.mongodb.getCollections();
            const result = await collections.flows.deleteOne({ id });
            return result.deletedCount > 0;
        }
        catch (error) {
            console.error('Failed to delete flow from database:', error);
            return false;
        }
    }
}
exports.FlowStore = FlowStore;
//# sourceMappingURL=FlowStoreMongo.js.map