import { describe, it, expect } from 'vitest';
import { parseCurlCommand, generateCurlCommand } from '../curlParser';

describe('curlParser', () => {
  describe('parseCurlCommand', () => {
    it('should parse simple GET request', () => {
      const result = parseCurlCommand('curl https://api.example.com/users');
      
      expect(result.method).toBe('GET');
      expect(result.url).toBe('https://api.example.com/users');
      expect(result.headers).toEqual({});
    });

    it('should parse POST request with JSON data', () => {
      const curlCommand = `curl -X POST "https://api.example.com/users" \\
        -H "Content-Type: application/json" \\
        -H "Authorization: Bearer token123" \\
        -d '{"name":"John","email":"john@example.com"}'`;
      
      const result = parseCurlCommand(curlCommand);
      
      expect(result.method).toBe('POST');
      expect(result.url).toBe('https://api.example.com/users');
      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['Authorization']).toBe('Bearer token123');
      expect(result.body).toEqual({
        name: 'John',
        email: 'john@example.com'
      });
    });

    it('should parse basic auth', () => {
      const result = parseCurlCommand('curl -u username:password https://api.example.com/secure');
      
      expect(result.headers['Authorization']).toMatch(/^Basic /);
    });

    it('should handle form data', () => {
      const result = parseCurlCommand('curl -X POST https://api.example.com/form -d "key=value&name=test"');
      
      expect(result.method).toBe('POST');
      expect(result.body).toBe('key=value&name=test');
    });
  });

  describe('generateCurlCommand', () => {
    it('should generate curl command from config', () => {
      const config = {
        method: 'POST' as const,
        url: 'https://api.example.com/test',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: { name: 'Test', value: 123 },
        timeout: 5000
      };
      
      const curlCmd = generateCurlCommand(config);
      
      expect(curlCmd).toContain('-X POST');
      expect(curlCmd).toContain('Content-Type: application/json');
      expect(curlCmd).toContain('--max-time 5');
      expect(curlCmd).toContain('https://api.example.com/test');
    });
  });
});