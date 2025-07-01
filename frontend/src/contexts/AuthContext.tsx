import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Organization, LoginRequest, RegisterRequest } from '../../../shared/src/types';
import { authApi } from '../services/authApi';
import Cookies from 'js-cookie';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = async () => {
    try {
      console.log('Checking authentication status...');
      const response = await authApi.getCurrentUser();
      console.log('Authentication successful:', response.user);
      setUser(response.user);
      setOrganization(response.organization || null);
    } catch (error) {
      console.log('Not authenticated:', error);
      // Not authenticated
      setUser(null);
      setOrganization(null);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      await refreshAuth();
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginRequest) => {
    const response = await authApi.login(credentials);
    setUser(response.user);
    setOrganization(response.organization || null);
    Cookies.set('auth-token', response.token, { expires: 7 });
  };

  const register = async (data: RegisterRequest) => {
    const response = await authApi.register(data);
    setUser(response.user);
    setOrganization(response.organization || null);
    Cookies.set('auth-token', response.token, { expires: 7 });
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
    setOrganization(null);
    Cookies.remove('auth-token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        isLoading,
        login,
        register,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};