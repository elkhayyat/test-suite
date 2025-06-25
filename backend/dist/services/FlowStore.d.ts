import { TestFlow } from '../../../shared/src/types';
export declare class FlowStore {
    private flows;
    constructor();
    private initialize;
    private loadFlowsFromDatabase;
    getAllFlows(): TestFlow[];
    getFlowsByProject(projectId: string): TestFlow[];
    getFlowsByFolder(folderId: string): TestFlow[];
    getFlow(id: string): TestFlow | undefined;
    createFlow(data: Partial<TestFlow>): Promise<TestFlow>;
    updateFlow(id: string, data: Partial<TestFlow>): Promise<TestFlow | undefined>;
    deleteFlow(id: string): Promise<boolean>;
}
//# sourceMappingURL=FlowStore.d.ts.map