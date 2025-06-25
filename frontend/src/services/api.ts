import axios from 'axios';
import { TestFlow, TestRun, Environment, EnvironmentVariable, Project, Folder } from '../../../shared/src/types';

const API_BASE_URL = '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  async getFlows(): Promise<TestFlow[]> {
    const response = await apiClient.get('/flows');
    return response.data;
  },

  async getFlow(id: string): Promise<TestFlow> {
    const response = await apiClient.get(`/flows/${id}`);
    return response.data;
  },

  async createFlow(flow: Partial<TestFlow>): Promise<TestFlow> {
    const response = await apiClient.post('/flows', flow);
    return response.data;
  },

  async updateFlow(id: string, flow: Partial<TestFlow>): Promise<TestFlow> {
    const response = await apiClient.put(`/flows/${id}`, flow);
    return response.data;
  },

  async deleteFlow(id: string): Promise<void> {
    await apiClient.delete(`/flows/${id}`);
  },

  async getRuns(): Promise<TestRun[]> {
    const response = await apiClient.get('/runs');
    return response.data;
  },

  async getRun(id: string): Promise<TestRun> {
    const response = await apiClient.get(`/runs/${id}`);
    return response.data;
  },

  async startRun(flowId: string, environmentId?: string): Promise<{ runId: string }> {
    const response = await apiClient.post('/runs', { flowId, environmentId });
    return response.data;
  },

  async stopRun(id: string): Promise<void> {
    await apiClient.post(`/runs/${id}/stop`);
  },

  async getEnvironments(): Promise<Environment[]> {
    const response = await apiClient.get('/environments');
    return response.data;
  },

  async getEnvironment(id: string): Promise<Environment> {
    const response = await apiClient.get(`/environments/${id}`);
    return response.data;
  },

  async createEnvironment(env: Partial<Environment>): Promise<Environment> {
    const response = await apiClient.post('/environments', env);
    return response.data;
  },

  async updateEnvironment(id: string, env: Partial<Environment>): Promise<Environment> {
    const response = await apiClient.put(`/environments/${id}`, env);
    return response.data;
  },

  async deleteEnvironment(id: string): Promise<void> {
    await apiClient.delete(`/environments/${id}`);
  },

  async getEnvironmentVariables(environmentId: string): Promise<EnvironmentVariable[]> {
    const response = await apiClient.get(`/environments/${environmentId}/variables`);
    return response.data;
  },

  async setEnvironmentVariable(environmentId: string, key: string, value: string, isSecret: boolean = false): Promise<EnvironmentVariable> {
    const response = await apiClient.put(`/environments/${environmentId}/variables/${key}`, { value, isSecret });
    return response.data;
  },

  async deleteEnvironmentVariable(environmentId: string, key: string): Promise<void> {
    await apiClient.delete(`/environments/${environmentId}/variables/${key}`);
  },

  // Projects
  async getProjects(): Promise<Project[]> {
    const response = await apiClient.get('/projects');
    return response.data;
  },

  async getProject(id: string): Promise<Project> {
    const response = await apiClient.get(`/projects/${id}`);
    return response.data;
  },

  async createProject(project: Partial<Project>): Promise<Project> {
    const response = await apiClient.post('/projects', project);
    return response.data;
  },

  async updateProject(id: string, project: Partial<Project>): Promise<Project> {
    const response = await apiClient.put(`/projects/${id}`, project);
    return response.data;
  },

  async deleteProject(id: string): Promise<void> {
    await apiClient.delete(`/projects/${id}`);
  },

  // Folders
  async getProjectFolders(projectId: string): Promise<Folder[]> {
    const response = await apiClient.get(`/projects/${projectId}/folders`);
    return response.data;
  },

  async getProjectFolderTree(projectId: string): Promise<any> {
    const response = await apiClient.get(`/projects/${projectId}/folder-tree`);
    return response.data;
  },

  async createFolder(projectId: string, folder: Partial<Folder>): Promise<Folder> {
    const response = await apiClient.post(`/projects/${projectId}/folders`, folder);
    return response.data;
  },

  async updateFolder(projectId: string, folderId: string, folder: Partial<Folder>): Promise<Folder> {
    const response = await apiClient.put(`/projects/${projectId}/folders/${folderId}`, folder);
    return response.data;
  },

  async deleteFolder(projectId: string, folderId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/folders/${folderId}`);
  },
};