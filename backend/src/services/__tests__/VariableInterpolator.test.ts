import { VariableInterpolator } from '../VariableInterpolator';
import { EnvironmentVariable } from '../../../../shared/src/types';

describe('VariableInterpolator', () => {
  let interpolator: VariableInterpolator;
  let variables: EnvironmentVariable[];

  beforeEach(() => {
    variables = [
      {
        id: '1',
        environmentId: 'test',
        key: 'baseUrl',
        value: 'https://api.example.com',
        isSecret: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        environmentId: 'test',
        key: 'userId',
        value: '123',
        isSecret: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    interpolator = new VariableInterpolator(variables);
  });

  describe('interpolateString', () => {
    it('should interpolate simple variables', () => {
      const result = interpolator.interpolateString('{{baseUrl}}/users/{{userId}}');
      expect(result).toBe('https://api.example.com/users/123');
    });

    it('should throw error for missing variables', () => {
      expect(() => {
        interpolator.interpolateString('{{baseUrl}}/users/{{missingVar}}');
      }).toThrow('Unresolved variables found: missingVar');
    });

    it('should handle simple string interpolation', () => {
      const result = interpolator.interpolateString('URL: {{baseUrl}}');
      expect(result).toBe('URL: https://api.example.com');
    });

    it('should handle empty input', () => {
      const result = interpolator.interpolateString('');
      expect(result).toBe('');
    });

    it('should handle input without variables', () => {
      const result = interpolator.interpolateString('No variables here');
      expect(result).toBe('No variables here');
    });
  });

  describe('getVariableNames', () => {
    it('should return all available variable names', () => {
      const names = interpolator.getVariableNames();
      expect(names).toEqual(['baseUrl', 'userId']);
    });
  });

  describe('containsVariables', () => {
    it('should detect variables in string', () => {
      expect(interpolator.containsVariables('{{baseUrl}}/test')).toBe(true);
      expect(interpolator.containsVariables('no variables here')).toBe(false);
    });
  });
});