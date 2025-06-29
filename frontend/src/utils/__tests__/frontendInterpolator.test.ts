import { describe, it, expect } from 'vitest';
import { FrontendInterpolator } from '../frontendInterpolator';
import { TestStep } from '../../../../shared/src/types';

describe('FrontendInterpolator', () => {
  const environmentVariables = {
    baseUrl: 'https://api.example.com',
    otpCode: '123456',
    apiKey: 'test-api-key'
  };

  const availableSteps: TestStep[] = [
    {
      id: '1751191204752',
      type: 'http',
      name: 'Get User List',
      config: { method: 'GET', url: '/users' }
    },
    {
      id: '123',
      type: 'http', 
      name: 'Login User',
      config: { method: 'POST', url: '/login' }
    }
  ];

  const interpolator = new FrontendInterpolator(environmentVariables, availableSteps);

  describe('interpolateValue', () => {
    it('should replace environment variables in strings', () => {
      const input = '{{baseUrl}}/auth/login';
      const result = interpolator.interpolateValue(input);
      expect(result).toBe('https://api.example.com/auth/login');
    });

    it('should replace multiple environment variables', () => {
      const input = '{{baseUrl}}/auth?code={{otpCode}}&key={{apiKey}}';
      const result = interpolator.interpolateValue(input);
      expect(result).toBe('https://api.example.com/auth?code=123456&key=test-api-key');
    });

    it('should keep non-matching placeholders unchanged', () => {
      const input = '{{baseUrl}}/auth/{{unknownVar}}';
      const result = interpolator.interpolateValue(input);
      expect(result).toBe('https://api.example.com/auth/{{unknownVar}}');
    });

    it('should generate random strings', () => {
      const input = '$random.string(10)';
      const result = interpolator.interpolateValue(input);
      expect(typeof result).toBe('string');
      expect(result.length).toBe(10);
    });

    it('should generate random numbers', () => {
      const input = '$random.number(1, 100)';
      const result = interpolator.interpolateValue(input);
      const num = parseInt(result);
      expect(num).toBeGreaterThanOrEqual(1);
      expect(num).toBeLessThanOrEqual(100);
    });

    it('should generate random UUIDs', () => {
      const input = '$random.uuid()';
      const result = interpolator.interpolateValue(input);
      expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should handle objects with nested interpolation', () => {
      const input = {
        url: '{{baseUrl}}/api',
        body: {
          code: '{{otpCode}}',
          random: '$random.string(5)'
        }
      };
      const result = interpolator.interpolateValue(input);
      expect(result.url).toBe('https://api.example.com/api');
      expect(result.body.code).toBe('123456');
      expect(typeof result.body.random).toBe('string');
      expect(result.body.random.length).toBe(5);
    });

    it('should handle arrays with interpolation', () => {
      const input = ['{{baseUrl}}', '$random.string(3)', 'static'];
      const result = interpolator.interpolateValue(input);
      expect(result[0]).toBe('https://api.example.com');
      expect(typeof result[1]).toBe('string');
      expect(result[1].length).toBe(3);
      expect(result[2]).toBe('static');
    });

    it('should handle non-string values', () => {
      expect(interpolator.interpolateValue(123)).toBe(123);
      expect(interpolator.interpolateValue(true)).toBe(true);
      expect(interpolator.interpolateValue(null)).toBe(null);
    });

    it('should replace step references with meaningful placeholders', () => {
      const input = '$1751191204752.data.items[0].id';
      const result = interpolator.interpolateValue(input);
      expect(result).toBe('item_0_id');
    });

    it('should handle step references in objects', () => {
      const input = {
        userId: '$1751191204752.data.items[0].id',
        token: '$123.response.token',
        email: '$123.data.user.email'
      };
      const result = interpolator.interpolateValue(input);
      expect(result.userId).toBe('item_0_id');
      expect(result.token).toBe('sample_token_value');
      expect(result.email).toBe('user@example.com');
    });

    it('should provide step-specific placeholders', () => {
      const input = '$123.data.something';
      const result = interpolator.interpolateValue(input);
      expect(result).toBe('Login User_data_value');
    });

    it('should handle mixed interpolation', () => {
      const input = {
        url: '{{baseUrl}}/users/$1751191204752.data.items[0].id',
        code: '{{otpCode}}',
        random: '$random.string(5)',
        userId: '$123.response.user.id'
      };
      const result = interpolator.interpolateValue(input);
      expect(result.url).toBe('https://api.example.com/users/item_0_id');
      expect(result.code).toBe('123456');
      expect(typeof result.random).toBe('string');
      expect(result.random.length).toBe(5);
      expect(result.userId).toBe('response_item_id');
    });
  });

  describe('getStepReferenceNote', () => {
    it('should detect step references with step names', () => {
      const configString = '{"user_id": "$1751191204752.data.user.id", "token": "$123.response.token"}';
      const note = interpolator.getStepReferenceNote(configString);
      expect(note).toContain('$1751191204752.data.user.id (from "Get User List")');
      expect(note).toContain('$123.response.token (from "Login User")');
      expect(note).toContain('replaced with placeholders');
    });

    it('should handle unknown step references', () => {
      const configString = '{"user_id": "$999.data.user.id"}';
      const note = interpolator.getStepReferenceNote(configString);
      expect(note).toContain('$999.data.user.id (from "Step_999")');
    });

    it('should return null when no step references found', () => {
      const configString = '{"code": "{{otpCode}}", "url": "{{baseUrl}}"}';
      const note = interpolator.getStepReferenceNote(configString);
      expect(note).toBe(null);
    });

    it('should deduplicate step references', () => {
      const configString = '{"user1": "$123.data.id", "user2": "$123.data.id", "name": "$1751191204752.name"}';
      const note = interpolator.getStepReferenceNote(configString);
      expect(note).toContain('$123.data.id (from "Login User")');
      expect(note).toContain('$1751191204752.name (from "Get User List")');
      // Should not contain duplicates
      expect((note?.match(/\$123\.data\.id/g) || []).length).toBe(1);
    });
  });
});