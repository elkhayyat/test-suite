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
      expect(result.body).toBe('{"name":"John","email":"john@example.com"}');
      // Verify the JSON string can be parsed back to the expected object
      expect(JSON.parse(result.body as string)).toEqual({
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

    it('should parse complex JSON data with arrays and nested objects', () => {
      const curlCommand = `curl -X POST \\
        -H "content-type: application/json" \\
        -H "accept: application/json" \\
        -H "X-Device-Platform: web" \\
        --data "{"title":"KS2","description":"Desc","target_launch_date":"2025-06-30T00:00:00.000","budget":15000,"target_age_range":"ALL","target_gender":"all","target_country":"Egypt","target_city":"Cairo","niche_ids":["c1c1b4df-b6f3-4f5f-a25b-1fd64953cf8a"],"objective_ids":["72c84290-acc1-4951-b8a2-847b86001418"],"required_hashtags":["#Sal"],"assets":[],"content_dos":"Do","content_donts":"Don","product_shipping_required":false,"store_visit_required":false,"store_location":null,"visit_date":null,"visit_time":null,"deliverables":[{"social_platform":"instagram","content_type":"post"}]}" \\
        "https://sandboxbackend.kliqapp.io/api/v1/campaigns/"`;
      
      const result = parseCurlCommand(curlCommand);
      
      expect(result.method).toBe('POST');
      expect(result.url).toBe('https://sandboxbackend.kliqapp.io/api/v1/campaigns/');
      expect(result.headers['content-type']).toBe('application/json');
      expect(result.headers['accept']).toBe('application/json');
      expect(result.headers['X-Device-Platform']).toBe('web');
      
      // Verify that the body is stored as a valid JSON string
      expect(typeof result.body).toBe('string');
      expect(() => JSON.parse(result.body as string)).not.toThrow();
      
      // Verify the parsed JSON structure
      const parsedBody = JSON.parse(result.body as string);
      expect(parsedBody.title).toBe('KS2');
      expect(parsedBody.description).toBe('Desc');
      expect(parsedBody.target_launch_date).toBe('2025-06-30T00:00:00.000');
      expect(parsedBody.budget).toBe(15000);
      expect(Array.isArray(parsedBody.niche_ids)).toBe(true);
      expect(parsedBody.niche_ids).toContain('c1c1b4df-b6f3-4f5f-a25b-1fd64953cf8a');
      expect(Array.isArray(parsedBody.deliverables)).toBe(true);
      expect(parsedBody.deliverables[0].social_platform).toBe('instagram');
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