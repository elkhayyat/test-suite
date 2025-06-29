export interface TestStep {
  id: string;
  type: 'http' | 'browser' | 'assertion' | 'delay' | 'condition' | 'sql' | 'subflow';
  name: string;
  config: Record<string, any>;
  position?: { x: number; y: number };
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
  selectedSteps?: string[];
  error?: string;
}

export type StepOutput = {
  status?: number;
  headers?: Record<string, string>;
  data?: unknown;
  screenshot?: string;
  success?: boolean;
  rows?: Record<string, unknown>[];
  rowCount?: number;
  executionTime?: number;
  query?: string;
  summary?: string;
};

export interface StepResult {
  stepId: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  startTime: Date;
  endTime?: Date;
  output?: StepOutput;
  error?: string;
  logs?: ConsoleLog[];
  duration?: number;
}

export interface ConsoleLog {
  timestamp: Date;
  level: 'log' | 'info' | 'warn' | 'error' | 'debug' | 'command';
  message: string;
  details?: Record<string, unknown> | string | null;
}

export interface HttpStepConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  body?: string | object | null;
  timeout?: number;
  validateStatus?: (status: number) => boolean;
  retries?: number;
  retryDelay?: number; // delay between retries in ms
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
  expected?: string | number | boolean | null;
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

export interface SubflowStepConfig {
  flowId: string;
  flowName?: string;
  timeout?: number;
  inheritEnvironment?: boolean;
  variableMapping?: Record<string, string>;
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
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FolderTree extends Folder {
  children: FolderTree[];
}

export interface IFlowStore {
  flows: Map<string, TestFlow>;
  loadFlowsFromDatabase(): Promise<void>;
  getAllFlows(): TestFlow[] | Promise<TestFlow[]>;
  getFlow(id: string): TestFlow | undefined | Promise<TestFlow | undefined>;
  createFlow(data: Partial<TestFlow>): Promise<TestFlow>;
  updateFlow(id: string, data: Partial<TestFlow>): Promise<TestFlow | null | undefined>;
  deleteFlow(id: string): Promise<boolean>;
  getFlowsByProject(projectId: string): TestFlow[] | Promise<TestFlow[]>;
  getFlowsByFolder(folderId: string): TestFlow[] | Promise<TestFlow[]>;
}

export interface IEnvironmentStore {
  getAllEnvironments(): Promise<Environment[]>;
  getEnvironment(id: string): Promise<Environment | undefined | null>;
  createEnvironment(data: Partial<Environment>): Promise<Environment>;
  updateEnvironment(id: string, data: Partial<Environment>): Promise<Environment | null | undefined>;
  deleteEnvironment(id: string): Promise<boolean>;
  getEnvironmentVariables(environmentId?: string): Promise<EnvironmentVariable[]>;
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