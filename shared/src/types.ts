export interface TestStep {
  id: string;
  type: 'http' | 'browser' | 'assertion' | 'delay' | 'condition';
  name: string;
  config: Record<string, any>;
  position?: { x: number; y: number };
}

export interface TestFlow {
  id: string;
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