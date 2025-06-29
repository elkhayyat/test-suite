import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>(() => {
    // Load from localStorage on initialization
    const saved = localStorage.getItem('selectedEnvironment');
    return saved || '';
  });
  const [environmentVariables, setEnvironmentVariables] = useState<{ [key: string]: string }>({});
  const [environments, setEnvironments] = useState<Environment[]>([]);

  // Wrapper function to save to localStorage when environment changes
  const handleSetSelectedEnvironment = (environmentId: string) => {
    setSelectedEnvironment(environmentId);
    localStorage.setItem('selectedEnvironment', environmentId);
  };

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
          // Convert array to object for backward compatibility
          const variablesObject = variables.reduce((acc: { [key: string]: string }, variable) => {
            acc[variable.key] = variable.value;
            return acc;
          }, {});
          setEnvironmentVariables(variablesObject);
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
      
      // Check if saved environment still exists
      if (selectedEnvironment && data.length > 0) {
        const savedEnvExists = data.some(env => env.id === selectedEnvironment);
        if (!savedEnvExists) {
          // Saved environment no longer exists, select default
          const defaultEnv = data.find(e => e.isDefault) || data[0];
          handleSetSelectedEnvironment(defaultEnv.id);
        }
      } else if (!selectedEnvironment && data.length > 0) {
        // No environment selected, auto-select default
        const defaultEnv = data.find(e => e.isDefault) || data[0];
        handleSetSelectedEnvironment(defaultEnv.id);
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
    setSelectedEnvironment: handleSetSelectedEnvironment,
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