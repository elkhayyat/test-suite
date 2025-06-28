import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Environment } from '../../../shared/src/types';
import { api } from '../services/api';

interface EnvironmentContextType {
  selectedEnvironment: string;
  setSelectedEnvironment: (environmentId: string) => void;
  environmentVariables: { [key: string]: string };
  environments: Environment[];
  refreshEnvironments: () => void;
}

const EnvironmentContext = createContext<EnvironmentContextType | undefined>(undefined);

interface EnvironmentProviderProps {
  children: ReactNode;
}

export function EnvironmentProvider({ children }: EnvironmentProviderProps) {
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('');
  const [environmentVariables, setEnvironmentVariables] = useState<{ [key: string]: string }>({});
  const [environments, setEnvironments] = useState<Environment[]>([]);

  // Load environments on mount
  useEffect(() => {
    loadEnvironments();
  }, []);

  // Load environment variables when selected environment changes
  useEffect(() => {
    const loadEnvironmentVariables = async () => {
      if (selectedEnvironment) {
        try {
          const variables = await api.getEnvironmentVariables(selectedEnvironment);
          setEnvironmentVariables(variables);
        } catch (error) {
          console.error('Failed to load environment variables:', error);
          setEnvironmentVariables({});
        }
      } else {
        setEnvironmentVariables({});
      }
    };
    
    loadEnvironmentVariables();
  }, [selectedEnvironment]);

  const loadEnvironments = async () => {
    try {
      const data = await api.getEnvironments();
      setEnvironments(data);
      
      // Auto-select default environment if none selected
      if (!selectedEnvironment && data.length > 0) {
        const defaultEnv = data.find(e => e.isDefault) || data[0];
        setSelectedEnvironment(defaultEnv.id);
      }
    } catch (error) {
      console.error('Failed to load environments:', error);
    }
  };

  const refreshEnvironments = () => {
    loadEnvironments();
  };

  const contextValue: EnvironmentContextType = {
    selectedEnvironment,
    setSelectedEnvironment,
    environmentVariables,
    environments,
    refreshEnvironments,
  };

  return (
    <EnvironmentContext.Provider value={contextValue}>
      {children}
    </EnvironmentContext.Provider>
  );
}

export function useEnvironment(): EnvironmentContextType {
  const context = useContext(EnvironmentContext);
  if (context === undefined) {
    throw new Error('useEnvironment must be used within an EnvironmentProvider');
  }
  return context;
}