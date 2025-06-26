import { EnvironmentVariable } from '../../../shared/src/types';

export class VariableInterpolator {
  private variables: Map<string, string>;

  constructor(variables: EnvironmentVariable[]) {
    this.variables = new Map();
    console.log('VariableInterpolator initialized with variables:', variables.map(v => ({ key: v.key, value: v.isSecret ? '[HIDDEN]' : v.value })));
    variables.forEach(v => {
      this.variables.set(v.key, v.value);
    });
    console.log('Available variable keys:', Array.from(this.variables.keys()));
  }

  /**
   * Interpolates variables in a string using {{variable}} syntax
   */
  interpolateString(str: string): string {
    if (typeof str !== 'string') return str;
    
    console.log('Interpolating string:', str);
    
    // Check for unresolved variables before attempting interpolation
    const unresolvedVars: string[] = [];
    const variableMatches = str.match(/\{\{(\w+)\}\}/g);
    
    if (variableMatches) {
      for (const match of variableMatches) {
        const varName = match.replace(/[{}]/g, '');
        if (!this.variables.has(varName)) {
          unresolvedVars.push(varName);
        }
      }
    }
    
    // If there are unresolved variables, throw an error with details
    if (unresolvedVars.length > 0) {
      const availableVars = Array.from(this.variables.keys()).join(', ');
      throw new Error(`Unresolved variables found: ${unresolvedVars.join(', ')}. Available variables: ${availableVars || 'none'}`);
    }
    
    // Replace all occurrences of {{variable}} with their values
    const result = str.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      const value = this.variables.get(varName);
      console.log(`Variable ${varName}: ${value !== undefined ? 'found' : 'NOT FOUND'} - value: ${value || 'undefined'}`);
      return value !== undefined ? value : match; // This should never hit the fallback now
    });
    console.log('Interpolation result:', result);
    return result;
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