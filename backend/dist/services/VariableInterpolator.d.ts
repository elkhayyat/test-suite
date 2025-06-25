import { EnvironmentVariable } from '../../../shared/src/types';
export declare class VariableInterpolator {
    private variables;
    constructor(variables: EnvironmentVariable[]);
    /**
     * Interpolates variables in a string using {{variable}} syntax
     */
    interpolateString(str: string): string;
    /**
     * Recursively interpolates variables in an object
     */
    interpolateObject(obj: any): any;
    /**
     * Interpolates variables in step configuration
     */
    interpolateStepConfig(config: Record<string, any>): Record<string, any>;
    /**
     * Gets all available variable names
     */
    getVariableNames(): string[];
    /**
     * Checks if a string contains variables
     */
    containsVariables(str: string): boolean;
}
//# sourceMappingURL=VariableInterpolator.d.ts.map