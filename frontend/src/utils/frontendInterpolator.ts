import { GENERATOR_FUNCTIONS } from './randomGenerators';
import { TestStep } from '../../../shared/src/types';

/**
 * Frontend-only interpolation utility for curl export
 * Handles environment variables and random generators, provides placeholders for step references
 */
export class FrontendInterpolator {
  private environmentVariables: Record<string, string>;
  private availableSteps: TestStep[];

  constructor(environmentVariables: Record<string, string>, availableSteps: TestStep[] = []) {
    this.environmentVariables = environmentVariables;
    this.availableSteps = availableSteps;
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
        const generator = GENERATOR_FUNCTIONS[functionName as keyof typeof GENERATOR_FUNCTIONS];
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
          
          // Call the generator function with proper argument spreading
          const result = (generator.generate as any)(...args);
          return String(result);
        }
      } catch (error) {
        console.warn(`Failed to generate random value for ${match}:`, error);
      }
      // Keep the original if generation fails
      return match;
    });

    // Replace step references with meaningful placeholders
    result = result.replace(/\$(\d+)\.([^\s,})"']+)/g, (_match, stepId, path) => {
      const referencedStep = this.availableSteps.find(step => step.id === stepId);
      
      // Generate a meaningful placeholder based on the path
      const placeholder = this.generatePlaceholderValue(path, referencedStep?.name);
      
      return placeholder;
    });

    return result;
  }

  /**
   * Generate a meaningful placeholder value based on the step reference path
   */
  private generatePlaceholderValue(path: string, stepName?: string): string {
    const stepPrefix = stepName ? `${stepName}_` : 'step_';
    
    // Common patterns and their placeholder values (order matters - most specific first)
    const patterns = [
      { regex: /items\[(\d+)\]\.id$/i, value: (_match: string, index: string) => `item_${index}_id` },
      { regex: /items\[(\d+)\]$/i, value: (_match: string, index: string) => `item_${index}_value` },
      { regex: /\[(\d+)\]\.id$/i, value: (_match: string, index: string) => `${index}_id_value` },
      { regex: /\[(\d+)\]$/i, value: (_match: string, index: string) => `array_item_${index}` },
      { regex: /data\..*\.id$/i, value: () => "data_item_id" },
      { regex: /response\..*\.id$/i, value: () => "response_item_id" },
      { regex: /\.id$/i, value: () => "12345" },
      { regex: /\.uuid$/i, value: () => "00000000-0000-0000-0000-000000000000" },
      { regex: /\.token$/i, value: () => "sample_token_value" },
      { regex: /\.email$/i, value: () => "user@example.com" },
      { regex: /\.name$/i, value: () => "Sample Name" },
      { regex: /\.url$/i, value: () => "https://example.com" },
      { regex: /\.code$/i, value: () => "123456" },
      { regex: /\.status$/i, value: () => "success" },
      { regex: /\.count$/i, value: () => "10" },
      { regex: /\.amount$/i, value: () => "100.00" },
      { regex: /\.date$/i, value: () => "2023-12-01T00:00:00Z" },
      { regex: /data\./i, value: () => `${stepPrefix}data_value` },
      { regex: /response\./i, value: () => `${stepPrefix}response_value` },
    ];

    for (const pattern of patterns) {
      const match = path.match(pattern.regex);
      if (match) {
        return pattern.value(match[0], match[1]);
      }
    }

    // Default placeholder with step context
    const cleanPath = path.replace(/^(data|response)\./, '').replace(/\[\d+\]/g, '_item');
    return `${stepPrefix}${cleanPath}_value`;
  }

  /**
   * Create a note about step references that were replaced with placeholders
   */
  getStepReferenceNote(configString: string): string | null {
    const stepReferences = configString.match(/\$(\d+)\.([^\s,})"']+)/g);
    if (stepReferences && stepReferences.length > 0) {
      const uniqueRefs = [...new Set(stepReferences)];
      const refDetails = uniqueRefs.map(ref => {
        const match = ref.match(/\$(\d+)\.(.+)/);
        if (match) {
          const [, stepId] = match;
          const referencedStep = this.availableSteps.find(step => step.id === stepId);
          const stepName = referencedStep ? referencedStep.name : `Step_${stepId}`;
          return `${ref} (from "${stepName}")`;
        }
        return ref;
      });
      
      return `Step references replaced with placeholders: ${refDetails.join(', ')}. During actual test execution, these would contain real values from the referenced steps.`;
    }
    return null;
  }
}