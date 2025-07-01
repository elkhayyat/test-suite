import axios, { AxiosInstance } from 'axios';
import type { 
  TestFlow, 
  TestRun, 
  Project, 
  Folder, 
  Environment,
  ProjectOpenAPISchema 
} from '../../shared/src/types.js';

export class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string, authToken: string) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  // Flow operations
  async getFlow(id: string): Promise<TestFlow> {
    const { data } = await this.client.get(`/api/flows/${id}`);
    return data;
  }

  async getFlowsByProject(projectId: string): Promise<TestFlow[]> {
    const { data } = await this.client.get(`/api/flows/project/${projectId}`);
    return data;
  }

  async getFlowsByFolder(folderId: string): Promise<TestFlow[]> {
    const { data } = await this.client.get(`/api/flows/folder/${folderId}`);
    return data;
  }

  async createFlow(flow: Partial<TestFlow>): Promise<TestFlow> {
    const { data } = await this.client.post('/api/flows', flow);
    return data;
  }

  async updateFlow(id: string, flow: Partial<TestFlow>): Promise<TestFlow> {
    const { data } = await this.client.put(`/api/flows/${id}`, flow);
    return data;
  }

  // Test run operations
  async runFlow(flowId: string, options?: {
    environmentId?: string;
    selectedSteps?: string[];
  }): Promise<TestRun> {
    const { data } = await this.client.post(`/api/flows/${flowId}/run`, options);
    return data;
  }

  async getTestRun(id: string): Promise<TestRun> {
    const { data } = await this.client.get(`/api/runs/${id}`);
    return data;
  }

  async getTestRuns(filters?: {
    flowId?: string;
    projectId?: string;
    status?: string;
    limit?: number;
  }): Promise<TestRun[]> {
    const { data } = await this.client.get('/api/runs', { params: filters });
    return data;
  }

  // Project operations
  async getProjects(): Promise<Project[]> {
    const { data } = await this.client.get('/api/projects');
    return data;
  }

  async getProject(id: string): Promise<Project> {
    const { data } = await this.client.get(`/api/projects/${id}`);
    return data;
  }

  async createProject(project: Partial<Project>): Promise<Project> {
    const { data } = await this.client.post('/api/projects', project);
    return data;
  }

  async addOpenAPISchema(projectId: string, schema: Partial<ProjectOpenAPISchema>): Promise<ProjectOpenAPISchema> {
    const { data } = await this.client.post(`/api/projects/${projectId}/schemas`, schema);
    return data;
  }

  // Folder operations
  async getFolder(id: string): Promise<Folder> {
    const { data } = await this.client.get(`/api/folders/${id}`);
    return data;
  }

  async getFoldersByProject(projectId: string): Promise<Folder[]> {
    const { data } = await this.client.get(`/api/folders/project/${projectId}`);
    return data;
  }

  async createFolder(folder: Partial<Folder>): Promise<Folder> {
    const { data } = await this.client.post('/api/folders', folder);
    return data;
  }

  // Environment operations
  async getEnvironments(): Promise<Environment[]> {
    const { data } = await this.client.get('/api/environments');
    return data;
  }

  async getEnvironment(id: string): Promise<Environment> {
    const { data } = await this.client.get(`/api/environments/${id}`);
    return data;
  }
}