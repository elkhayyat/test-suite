import { EnvironmentVariable, StepResult } from '../../../shared/src/types';
import { processRandomGenerators } from '../utils/randomGenerators';

export class EnhancedInterpolator {
  private variables: Map<string, string>;
  private stepResults: Map<string, StepResult>;

  constructor(variables: EnvironmentVariable[], stepResults: StepResult[] = []) {
    this.variables = new Map();
    variables.forEach(v => {
      // Process random values in environment variables
      const processedValue = processRandomGenerators(v.value);
      this.variables.set(v.key, processedValue);
    });

    this.stepResults = new Map();
    stepResults.forEach(result => {
      this.stepResults.set(result.stepId, result);
    });

    console.log('EnhancedInterpolator initialized with:', {
      variableCount: this.variables.size,
      stepResultCount: this.stepResults.size
    });
  }

  /**
   * Updates step results for interpolation (merges with existing results)
   */
  updateStepResults(stepResults: StepResult[]): void {
    // Merge new results with existing ones (new results take precedence)
    stepResults.forEach(result => {
      this.stepResults.set(result.stepId, result);
    });
  }

  /**
   * Interpolates both {{variable}} and $stepId.data.path syntax
   */
  interpolateString(str: string): string {
    if (typeof str !== 'string') return str;
    
    console.log('Interpolating string:', str);
    
    // First handle {{variable}} syntax
    let result = this.interpolateEnvironmentVariables(str);
    
    // Then handle $stepId.data.path syntax
    result = this.interpolateStepReferences(result);
    
    console.log('Final interpolation result:', result);
    return result;
  }

  /**
   * Interpolates {{variable}} syntax
   */
  private interpolateEnvironmentVariables(str: string): string {
    // Check for unresolved variables
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
    
    if (unresolvedVars.length > 0) {
      const availableVars = Array.from(this.variables.keys()).join(', ');
      throw new Error(`Unresolved variables found: ${unresolvedVars.join(', ')}. Available variables: ${availableVars || 'none'}`);
    }
    
    // Replace all occurrences of {{variable}} with their values
    return str.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      const value = this.variables.get(varName);
      console.log(`Variable ${varName}: ${value !== undefined ? 'found' : 'NOT FOUND'}`);
      return value !== undefined ? value : match;
    });
  }

  /**
   * Interpolates $stepId.data.path syntax
   */
  private interpolateStepReferences(str: string): string {
    // Match $stepId.data.path patterns - only match when $ is at start or preceded by whitespace
    return str.replace(/(?:^|\s)\$([a-zA-Z0-9_][a-zA-Z0-9_-]*)(\.[a-zA-Z0-9._\[\]]+)?/g, (match, stepId, path) => {
      console.log(`Processing step reference: stepId=${stepId}, path=${path}`);
      
      const stepResult = this.stepResults.get(stepId);
      if (!stepResult) {
        console.log(`Step ${stepId} not found in results`);
        throw new Error(`Step result not found for: ${stepId}`);
      }

      if (!stepResult.output) {
        console.log(`Step ${stepId} has no output`);
        throw new Error(`Step ${stepId} has no output`);
      }

      if (!path) {
        // Return the entire output
        return typeof stepResult.output === 'string' 
          ? stepResult.output 
          : JSON.stringify(stepResult.output);
      }

      // Navigate the path
      try {
        const value = this.navigatePath(stepResult.output, path.substring(1)); // Remove leading dot
        return value === undefined ? 'undefined' : 
               value === null ? 'null' :
               typeof value === 'object' ? JSON.stringify(value) : String(value);
      } catch (error) {
        console.error(`Error navigating path ${path} in step ${stepId}:`, error);
        throw new Error(`Cannot access path ${path} in step ${stepId}: ${error.message}`);
      }
    });
  }

  /**
   * Navigates a dot-notation path in an object
   */
  private navigatePath(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      // Handle array access like items[0]
      const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, arrayKey, index] = arrayMatch;
        current = current[arrayKey];
        if (!Array.isArray(current)) {
          throw new Error(`'${arrayKey}' is not an array`);
        }
        current = current[parseInt(index)];
      } else {
        current = current[key];
      }

      if (current === undefined) {
        throw new Error(`Property '${key}' not found`);
      }
    }

    return current;
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
    
    return obj;
  }

  /**
   * Interpolates variables in step configuration
   */
  interpolateStepConfig(config: Record<string, any>): Record<string, any> {
    return this.interpolateObject(config);
  }

  /**
   * Checks if a string contains any interpolation syntax
   */
  containsInterpolation(str: string): boolean {
    if (typeof str !== 'string') return false;
    return /\{\{(\w+)\}\}/.test(str) || /(?:^|\s)\$[a-zA-Z0-9_][a-zA-Z0-9_-]*/.test(str);
  }
}