import axios from 'axios';
import { TestFlow, TestRun } from '../../../shared/src/types';

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

  async startRun(flowId: string): Promise<{ runId: string }> {
    const response = await apiClient.post('/runs', { flowId });
    return response.data;
  },

  async stopRun(id: string): Promise<void> {
    await apiClient.post(`/runs/${id}/stop`);
  },
};