import { TestFlow } from '../../../shared/src/types';
import { MongoDB } from '../db/mongodb';
export declare class FlowStore {
    private mongodb;
    constructor(mongodb: MongoDB);
    private initialize;
    getAllFlows(): Promise<TestFlow[]>;
    getFlowsByProject(projectId: string): Promise<TestFlow[]>;
    getFlowsByFolder(folderId: string): Promise<TestFlow[]>;
    getFlow(id: string): Promise<TestFlow | undefined>;
    createFlow(data: Partial<TestFlow>): Promise<TestFlow>;
    updateFlow(id: string, data: Partial<TestFlow>): Promise<TestFlow | undefined>;
    deleteFlow(id: string): Promise<boolean>;
}
//# sourceMappingURL=FlowStoreMongo.d.ts.map