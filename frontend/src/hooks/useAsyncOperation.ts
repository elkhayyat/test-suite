import { useState, useCallback } from 'react';

export interface AsyncOperationState {
  isLoading: boolean;
  error: string | null;
}

export interface AsyncOperationHook<T = any> {
  execute: (...args: any[]) => Promise<T>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Hook for managing async operation state with loading and error handling
 */
export function useAsyncOperation<T = any>(
  asyncFunction: (...args: any[]) => Promise<T>
): AsyncOperationHook<T> {
  const [state, setState] = useState<AsyncOperationState>({
    isLoading: false,
    error: null,
  });

  const execute = useCallback(async (...args: any[]): Promise<T> => {
    setState({ isLoading: true, error: null });
    
    try {
      const result = await asyncFunction(...args);
      setState({ isLoading: false, error: null });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setState({ isLoading: false, error: errorMessage });
      throw error;
    }
  }, [asyncFunction]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    execute,
    isLoading: state.isLoading,
    error: state.error,
    clearError,
  };
}

/**
 * Hook for managing multiple async operations
 */
export function useAsyncOperations() {
  const [operations, setOperations] = useState<Record<string, AsyncOperationState>>({});

  const createOperation = useCallback(<T = any>(
    key: string,
    asyncFunction: (...args: any[]) => Promise<T>
  ) => {
    const execute = async (...args: any[]): Promise<T> => {
      setOperations(prev => ({
        ...prev,
        [key]: { isLoading: true, error: null }
      }));
      
      try {
        const result = await asyncFunction(...args);
        setOperations(prev => ({
          ...prev,
          [key]: { isLoading: false, error: null }
        }));
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        setOperations(prev => ({
          ...prev,
          [key]: { isLoading: false, error: errorMessage }
        }));
        throw error;
      }
    };

    return {
      execute,
      isLoading: operations[key]?.isLoading || false,
      error: operations[key]?.error || null,
      clearError: () => {
        setOperations(prev => ({
          ...prev,
          [key]: { ...prev[key], error: null }
        }));
      }
    };
  }, [operations]);

  return { createOperation, operations };
}