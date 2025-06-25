import { EnvironmentVariable } from '../../../shared/src/types';

export class VariableInterpolator {
  private variables: Map<string, string>;

  constructor(variables: EnvironmentVariable[]) {
    this.variables = new Map();
    variables.forEach(v => {
      this.variables.set(v.key, v.value);
    });
  }

  /**
   * Interpolates variables in a string using {{variable}} syntax
   */
  interpolateString(str: string): string {
    if (typeof str !== 'string') return str;
    
    // Replace all occurrences of {{variable}} with their values
    return str.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      const value = this.variables.get(varName);
      return value !== undefined ? value : match; // Keep original if not found
    });
  }

  /**
   * Recursively interpolates variables in an object
   */
  interpolateObject(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    
    if (typeof obj === 'string') {
      return this.interpolateString(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.interpolateObject(item));
    }
    
    if (typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.interpolateObject(value);
      }
      return result;
    }
    
    return obj; // Return as-is for numbers, booleans, etc.
  }

  /**
   * Interpolates variables in step configuration
   */
  interpolateStepConfig(config: Record<string, any>): Record<string, any> {
    return this.interpolateObject(config);
  }

  /**
   * Gets all available variable names
   */
  getVariableNames(): string[] {
    return Array.from(this.variables.keys());
  }

  /**
   * Checks if a string contains variables
   */
  containsVariables(str: string): boolean {
    if (typeof str !== 'string') return false;
    return /\{\{(\w+)\}\}/.test(str);
  }
}