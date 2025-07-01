import axios from 'axios';
import { TestFlow, TestRun, Environment, EnvironmentVariable, Project, Folder, Organization, Team, TeamUser, TeamUserWithDetails, ProjectTeam, ProjectOpenAPISchema, ApiToken } from '../../../shared/src/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with requests
  timeout: 30000, // 30 second timeout
});

// Add request interceptor for debugging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log(`Response ${response.status} from ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('Response error:', error.message, error.config?.url);
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout:', error.message);
    } else if (error.response?.status === 401) {
      // Handle authentication errors
      console.error('Authentication error:', error.response.data);
      // Could redirect to login here
    } else if (error.request) {
      console.error('Network error:', error.message);
    }
    return Promise.reject(error);
  }
);
console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
console.log('API_BASE_URL:', API_BASE_URL);
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

  async startRun(flowId: string, environmentId?: string, selectedSteps?: string[]): Promise<{ runId: string }> {
    console.log('API startRun called with:', { flowId, environmentId, selectedSteps });
    const response = await apiClient.post('/runs', { flowId, environmentId, selectedSteps });
    console.log('API startRun response:', response.data);
    return response.data;
  },

  async stopRun(id: string): Promise<void> {
    await apiClient.post(`/runs/${id}/stop`);
  },

  async startBulkProjectRun(projectId: string, environmentId?: string): Promise<{ message: string; results: Array<{ flowId: string; flowName: string; runId?: string; error?: string }> }> {
    const response = await apiClient.post(`/runs/bulk/project/${projectId}`, { environmentId });
    return response.data;
  },

  async startBulkFolderRun(folderId: string, environmentId?: string): Promise<{ message: string; results: Array<{ flowId: string; flowName: string; runId?: string; error?: string }> }> {
    const response = await apiClient.post(`/runs/bulk/folder/${folderId}`, { environmentId });
    return response.data;
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

  async exportEnvironment(environmentId: string): Promise<any> {
    const response = await apiClient.get(`/environments/${environmentId}/export`);
    return response.data;
  },

  async importEnvironment(environmentId: string, data: any): Promise<any> {
    const response = await apiClient.post(`/environments/${environmentId}/import`, data);
    return response.data;
  },

  async duplicateEnvironment(environmentId: string): Promise<Environment> {
    const response = await apiClient.post(`/environments/${environmentId}/duplicate`);
    return response.data;
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

  async exportProject(projectId: string): Promise<any> {
    const response = await apiClient.get(`/projects/${projectId}/export`);
    return response.data;
  },

  async importProject(projectId: string, data: any): Promise<any> {
    const response = await apiClient.post(`/projects/${projectId}/import`, data);
    return response.data;
  },

  // Project OpenAPI Schemas
  async getProjectOpenAPISchemas(projectId: string): Promise<ProjectOpenAPISchema[]> {
    const response = await apiClient.get(`/projects/${projectId}/openapi-schemas`);
    return response.data;
  },

  async createProjectOpenAPISchema(projectId: string, schema: Partial<ProjectOpenAPISchema>): Promise<ProjectOpenAPISchema> {
    const response = await apiClient.post(`/projects/${projectId}/openapi-schemas`, schema);
    return response.data;
  },

  async updateProjectOpenAPISchema(projectId: string, schemaId: string, schema: Partial<ProjectOpenAPISchema>): Promise<ProjectOpenAPISchema> {
    const response = await apiClient.put(`/projects/${projectId}/openapi-schemas/${schemaId}`, schema);
    return response.data;
  },

  async deleteProjectOpenAPISchema(projectId: string, schemaId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/openapi-schemas/${schemaId}`);
  },

  async generateFlowsFromOpenAPISchema(
    projectId: string,
    schemaId: string,
    selectedOperations: string[],
    baseUrlOverride?: string,
    folderId?: string
  ): Promise<TestFlow[]> {
    const response = await apiClient.post(`/projects/${projectId}/openapi-schemas/${schemaId}/generate-flows`, {
      selectedOperations,
      baseUrlOverride,
      folderId
    });
    return response.data;
  },

  // Organizations
  async getOrganizations(): Promise<Organization[]> {
    const response = await apiClient.get('/organizations');
    return response.data;
  },

  async getOrganization(id: string): Promise<Organization> {
    const response = await apiClient.get(`/organizations/${id}`);
    return response.data;
  },

  async createOrganization(org: Partial<Organization>): Promise<Organization> {
    const response = await apiClient.post('/organizations', org);
    return response.data;
  },

  async updateOrganization(id: string, org: Partial<Organization>): Promise<Organization> {
    const response = await apiClient.put(`/organizations/${id}`, org);
    return response.data;
  },

  async deleteOrganization(id: string): Promise<void> {
    await apiClient.delete(`/organizations/${id}`);
  },

  async exportOrganization(id: string): Promise<any> {
    const response = await apiClient.get(`/organizations/${id}/export`);
    return response.data;
  },

  async importOrganization(id: string, data: any): Promise<any> {
    const response = await apiClient.post(`/organizations/${id}/import`, data);
    return response.data;
  },

  // Teams
  async getTeams(organizationId: string): Promise<Team[]> {
    const response = await apiClient.get(`/organizations/${organizationId}/teams`);
    return response.data;
  },

  async getTeam(organizationId: string, teamId: string): Promise<Team> {
    const response = await apiClient.get(`/organizations/${organizationId}/teams/${teamId}`);
    return response.data;
  },

  async createTeam(organizationId: string, team: Partial<Team>): Promise<Team> {
    const response = await apiClient.post(`/organizations/${organizationId}/teams`, team);
    return response.data;
  },

  async updateTeam(organizationId: string, teamId: string, team: Partial<Team>): Promise<Team> {
    const response = await apiClient.put(`/organizations/${organizationId}/teams/${teamId}`, team);
    return response.data;
  },

  async deleteTeam(organizationId: string, teamId: string): Promise<void> {
    await apiClient.delete(`/organizations/${organizationId}/teams/${teamId}`);
  },

  // Team Users
  async getTeamUsers(organizationId: string, teamId: string): Promise<TeamUserWithDetails[]> {
    const response = await apiClient.get(`/organizations/${organizationId}/teams/${teamId}/users`);
    return response.data;
  },

  async addUserToTeam(organizationId: string, teamId: string, userId: string, role: TeamUser['role']): Promise<TeamUser> {
    const response = await apiClient.post(`/organizations/${organizationId}/teams/${teamId}/users`, { userId, role });
    return response.data;
  },

  async updateTeamUserRole(organizationId: string, teamId: string, userId: string, role: TeamUser['role']): Promise<TeamUser> {
    const response = await apiClient.put(`/organizations/${organizationId}/teams/${teamId}/users/${userId}`, { role });
    return response.data;
  },

  async removeUserFromTeam(organizationId: string, teamId: string, userId: string): Promise<void> {
    await apiClient.delete(`/organizations/${organizationId}/teams/${teamId}/users/${userId}`);
  },

  // Project Teams
  async getProjectTeams(projectId: string): Promise<ProjectTeam[]> {
    const response = await apiClient.get(`/projects/${projectId}/teams`);
    return response.data;
  },

  async addTeamToProject(projectId: string, teamId: string, permissions: ProjectTeam['permissions']): Promise<ProjectTeam> {
    const response = await apiClient.post(`/projects/${projectId}/teams`, { teamId, permissions });
    return response.data;
  },

  async updateProjectTeamPermissions(projectId: string, teamId: string, permissions: ProjectTeam['permissions']): Promise<ProjectTeam> {
    const response = await apiClient.put(`/projects/${projectId}/teams/${teamId}`, { permissions });
    return response.data;
  },

  async removeTeamFromProject(projectId: string, teamId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/teams/${teamId}`);
  },

  // API Tokens
  async getApiTokens(): Promise<ApiToken[]> {
    const response = await apiClient.get('/api-tokens');
    return response.data;
  },

  async createApiToken(tokenData: Partial<ApiToken>): Promise<ApiToken> {
    const response = await apiClient.post('/api-tokens', tokenData);
    return response.data;
  },

  async revokeApiToken(tokenId: string): Promise<void> {
    await apiClient.put(`/api-tokens/${tokenId}/revoke`);
  },

  async deleteApiToken(tokenId: string): Promise<void> {
    await apiClient.delete(`/api-tokens/${tokenId}`);
  },
};