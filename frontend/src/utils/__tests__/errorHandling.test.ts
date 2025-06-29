import { describe, it, expect } from 'vitest';

// Helper function to test error message formatting
function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

// Helper function to test async error handling
async function handleAsyncOperation<T>(
  operation: () => Promise<T>,
  errorCallback?: (error: string) => void
): Promise<{ success: boolean; result?: T; error?: string }> {
  try {
    const result = await operation();
    return { success: true, result };
  } catch (error) {
    const errorMessage = formatErrorMessage(error);
    if (errorCallback) {
      errorCallback(errorMessage);
    }
    return { success: false, error: errorMessage };
  }
}

describe('Error Handling Utils', () => {
  describe('formatErrorMessage', () => {
    it('formats Error objects correctly', () => {
      const error = new Error('Test error message');
      expect(formatErrorMessage(error)).toBe('Test error message');
    });

    it('handles unknown error types', () => {
      expect(formatErrorMessage('string error')).toBe('Unknown error');
      expect(formatErrorMessage(null)).toBe('Unknown error');
      expect(formatErrorMessage(undefined)).toBe('Unknown error');
      expect(formatErrorMessage(123)).toBe('Unknown error');
    });
  });

  describe('handleAsyncOperation', () => {
    it('handles successful operations', async () => {
      const operation = () => Promise.resolve('success');
      const result = await handleAsyncOperation(operation);
      
      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.error).toBeUndefined();
    });

    it('handles failed operations with Error objects', async () => {
      const operation = () => Promise.reject(new Error('Operation failed'));
      const result = await handleAsyncOperation(operation);
      
      expect(result.success).toBe(false);
      expect(result.result).toBeUndefined();
      expect(result.error).toBe('Operation failed');
    });

    it('handles failed operations with unknown error types', async () => {
      const operation = () => Promise.reject('string error');
      const result = await handleAsyncOperation(operation);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });

    it('calls error callback when provided', async () => {
      let callbackError = '';
      const errorCallback = (error: string) => {
        callbackError = error;
      };
      
      const operation = () => Promise.reject(new Error('Callback test'));
      await handleAsyncOperation(operation, errorCallback);
      
      expect(callbackError).toBe('Callback test');
    });
  });
});