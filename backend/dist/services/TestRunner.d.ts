import { Server } from 'socket.io';
import { TestRun } from '../../../shared/src/types';
import { FlowStore } from './FlowStore';
export declare class TestRunner {
    private io;
    private flowStore;
    private runs;
    private browser;
    private activeRuns;
    private environmentStore;
    constructor(io: Server, flowStore: FlowStore);
    getAllRuns(): TestRun[];
    getRun(id: string): TestRun | undefined;
    startRun(flowId: string, environmentId?: string, selectedSteps?: string[]): Promise<string>;
    stopRun(runId: string): boolean;
    private executeFlow;
    private calculateExecutionOrder;
    private executeStep;
    private executeHttpStep;
    private executeBrowserStep;
    private executeDelayStep;
    private executeAssertionStep;
    private executeSqlStep;
    private addStepResult;
    private updateRunStatus;
}
//# sourceMappingURL=TestRunner.d.ts.map