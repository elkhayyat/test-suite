import { VariableInterpolator } from '../VariableInterpolator';

describe('VariableInterpolator', () => {
  let interpolator: VariableInterpolator;

  beforeEach(() => {
    interpolator = new VariableInterpolator();
  });

  describe('interpolate', () => {
    it('should interpolate simple variables', () => {
      const variables = new Map([
        ['baseUrl', 'https://api.example.com'],
        ['userId', '123']
      ]);

      const result = interpolator.interpolate('{{baseUrl}}/users/{{userId}}', variables);
      expect(result).toBe('https://api.example.com/users/123');
    });

    it('should handle missing variables', () => {
      const variables = new Map([['baseUrl', 'https://api.example.com']]);

      const result = interpolator.interpolate('{{baseUrl}}/users/{{missingVar}}', variables);
      expect(result).toBe('https://api.example.com/users/{{missingVar}}');
    });

    it('should handle nested object interpolation', () => {
      const variables = new Map([
        ['user', JSON.stringify({ id: 123, name: 'John' })]
      ]);

      const result = interpolator.interpolate('User: {{user.name}} (ID: {{user.id}})', variables);
      expect(result).toBe('User: John (ID: 123)');
    });

    it('should handle empty input', () => {
      const variables = new Map();
      
      const result = interpolator.interpolate('', variables);
      expect(result).toBe('');
    });

    it('should handle input without variables', () => {
      const variables = new Map([['test', 'value']]);
      
      const result = interpolator.interpolate('No variables here', variables);
      expect(result).toBe('No variables here');
    });
  });

  describe('extractVariables', () => {
    it('should extract variable names from template', () => {
      const template = 'GET {{baseUrl}}/users/{{userId}}/posts/{{postId}}';
      
      const variables = interpolator.extractVariables(template);
      expect(variables).toEqual(['baseUrl', 'userId', 'postId']);
    });

    it('should handle duplicate variables', () => {
      const template = '{{baseUrl}}/users/{{userId}}/avatar?size={{size}}&format={{format}}&userId={{userId}}';
      
      const variables = interpolator.extractVariables(template);
      expect(variables).toEqual(['baseUrl', 'userId', 'size', 'format']);
    });

    it('should return empty array for no variables', () => {
      const template = 'No variables in this string';
      
      const variables = interpolator.extractVariables(template);
      expect(variables).toEqual([]);
    });
  });
});