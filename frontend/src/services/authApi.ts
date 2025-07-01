import axios from 'axios';
import { LoginRequest, RegisterRequest, AuthResponse, InvitationRequest, InvitationResponse } from '../../../shared/src/types';

// Ensure API_BASE_URL doesn't have trailing slash
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

// Debug logging for production
if (import.meta.env.MODE === 'production') {
  console.log('[AuthAPI] Environment:', {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    API_BASE_URL,
    authBaseURL: `${API_BASE_URL}/auth`,
    mode: import.meta.env.MODE
  });
}

const authApi = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
  withCredentials: true, // Send cookies with requests
});

// Add request interceptor for debugging
authApi.interceptors.request.use(
  (config) => {
    console.log('[AuthAPI] Request:', {
      method: config.method,
      url: config.url,
      baseURL: config.baseURL,
      fullURL: axios.getUri(config)
    });
    return config;
  },
  (error) => {
    console.error('[AuthAPI] Request error:', error);
    return Promise.reject(error);
  }
);

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