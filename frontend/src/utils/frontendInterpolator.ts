import { GENERATOR_FUNCTIONS } from './randomGenerators';

/**
 * Frontend-only interpolation utility for curl export
 * Handles environment variables and random generators, but not step references
 */
export class FrontendInterpolator {
  private environmentVariables: Record<string, string>;

  constructor(environmentVariables: Record<string, string>) {
    this.environmentVariables = environmentVariables;
  }

  /**
   * Interpolate a single value (string, number, boolean, etc.)
   */
  interpolateValue(value: any): any {
    if (typeof value === 'string') {
      return this.interpolateString(value);
    } else if (Array.isArray(value)) {
      return value.map(item => this.interpolateValue(item));
    } else if (value && typeof value === 'object') {
      const result: any = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = this.interpolateValue(val);
      }
      return result;
    }
    return value;
  }

  /**
   * Interpolate environment variables and random generators in a string
   */
  private interpolateString(str: string): string {
    let result = str;

    // Replace environment variables {{variableName}}
    result = result.replace(/\{\{([^}]+)\}\}/g, (match, variableName) => {
      const trimmedName = variableName.trim();
      if (this.environmentVariables.hasOwnProperty(trimmedName)) {
        return this.environmentVariables[trimmedName];
      }
      // Keep the original placeholder if variable not found
      return match;
    });

    // Replace random generators $random.function()
    result = result.replace(/\$random\.(\w+)\(([^)]*)\)/g, (match, functionName, argsStr) => {
      try {
        const generator = GENERATOR_FUNCTIONS[functionName];
        if (generator) {
          // Parse arguments
          const args = argsStr.trim() ? argsStr.split(',').map((arg: string) => {
            const trimmed = arg.trim();
            // Try to parse as number, otherwise treat as string
            if (/^\d+$/.test(trimmed)) {
              return parseInt(trimmed, 10);
            } else if (/^\d+\.\d+$/.test(trimmed)) {
              return parseFloat(trimmed);
            } else {
              // Remove quotes if present
              return trimmed.replace(/^["'](.*)["']$/, '$1');
            }
          }) : [];
          
          return generator.generate(...args);
        }
      } catch (error) {
        console.warn(`Failed to generate random value for ${match}:`, error);
      }
      // Keep the original if generation fails
      return match;
    });

    return result;
  }

  /**
   * Create a note about step references that couldn't be resolved
   */
  getStepReferenceNote(configString: string): string | null {
    const stepReferences = configString.match(/\$\d+\.[^\s,})\]]+/g);
    if (stepReferences && stepReferences.length > 0) {
      const uniqueRefs = [...new Set(stepReferences)];
      return `Note: Step references (${uniqueRefs.join(', ')}) cannot be resolved in curl export. These would be substituted with actual values during test execution.`;
    }
    return null;
  }
}