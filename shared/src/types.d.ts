export interface TestStep {
    id: string;
    type: 'http' | 'browser' | 'assertion' | 'delay' | 'condition' | 'sql';
    name: string;
    config: Record<string, any>;
    position?: {
        x: number;
        y: number;
    };
}
export interface TestFlow {
    id: string;
    projectId?: string;
    folderId?: string;
    name: string;
    description?: string;
    steps: TestStep[];
    connections: Connection[];
    createdAt: Date;
    updatedAt: Date;
}
export interface Connection {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
}
export interface TestRun {
    id: string;
    flowId: string;
    environmentId?: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    startTime: Date;
    endTime?: Date;
    results: StepResult[];
}
export interface StepResult {
    stepId: string;
    status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
    startTime: Date;
    endTime?: Date;
    output?: any;
    error?: string;
}
export interface HttpStepConfig {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    url: string;
    headers?: Record<string, string>;
    body?: any;
    timeout?: number;
    validateStatus?: (status: number) => boolean;
}
export interface BrowserStepConfig {
    action: 'navigate' | 'click' | 'type' | 'wait' | 'screenshot';
    selector?: string;
    value?: string;
    timeout?: number;
}
export interface AssertionStepConfig {
    type: 'equals' | 'contains' | 'exists' | 'custom';
    source: string;
    expected?: any;
    customScript?: string;
}
export interface DelayStepConfig {
    duration: number;
}
export interface ConditionStepConfig {
    script: string;
    trueTarget?: string;
    falseTarget?: string;
}
export interface SqlStepConfig {
    connectionString: string;
    query: string;
    parameters?: Record<string, any>;
    timeout?: number;
}
export interface Environment {
    id: string;
    name: string;
    description?: string;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface EnvironmentVariable {
    id: string;
    environmentId: string;
    key: string;
    value: string;
    isSecret: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface FlowEnvironmentConfig {
    id: string;
    flowId: string;
    environmentId: string;
    stepId: string;
    configOverrides: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
export interface Project {
    id: string;
    organizationId: string;
    name: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Folder {
    id: string;
    projectId: string;
    parentId?: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface User {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'developer' | 'tester' | 'viewer';
    organizationId?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface ProjectUser {
    id: string;
    projectId: string;
    userId: string;
    role: 'owner' | 'admin' | 'member' | 'viewer';
    createdAt: Date;
}
export interface Organization {
    id: string;
    name: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Team {
    id: string;
    organizationId: string;
    name: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface TeamUser {
    id: string;
    teamId: string;
    userId: string;
    role: 'owner' | 'admin' | 'member' | 'viewer';
    createdAt: Date;
    updatedAt: Date;
}
export interface ProjectTeam {
    id: string;
    projectId: string;
    teamId: string;
    permissions: 'read' | 'write' | 'admin';
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=types.d.ts.map