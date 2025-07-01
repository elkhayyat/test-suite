import axios from 'axios';
import { LoginRequest, RegisterRequest, AuthResponse, InvitationRequest, InvitationResponse } from '../../../shared/src/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const authApi = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
  withCredentials: true, // Send cookies with requests
});

export const authApiService = {
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await authApi.post('/register', data);
    return response.data;
  },

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await authApi.post('/login', credentials);
    return response.data;
  },

  async logout(): Promise<void> {
    await authApi.post('/logout');
  },

  async getCurrentUser(): Promise<{ user: any; organization: any }> {
    const response = await authApi.get('/me');
    return response.data;
  },

  async sendInvitation(data: InvitationRequest): Promise<InvitationResponse> {
    const response = await authApi.post('/invite', data);
    return response.data;
  },

  async acceptInvitation(token: string, password: string, name: string): Promise<AuthResponse> {
    const response = await authApi.post('/accept-invitation', {
      token,
      password,
      name,
    });
    return response.data;
  },

  async setActiveEnvironment(environmentId: string): Promise<{ user: any }> {
    const response = await authApi.put('/active-environment', {
      environmentId,
    });
    return response.data;
  },
};

export { authApiService as authApi };