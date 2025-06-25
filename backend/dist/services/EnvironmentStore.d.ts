import { Environment, EnvironmentVariable } from '../../../shared/src/types';
export declare class EnvironmentStore {
    getEnvironments(): Promise<Environment[]>;
    getEnvironment(id: string): Promise<Environment | null>;
    createEnvironment(data: Partial<Environment>): Promise<Environment>;
    updateEnvironment(id: string, data: Partial<Environment>): Promise<Environment | null>;
    deleteEnvironment(id: string): Promise<boolean>;
    getEnvironmentVariables(environmentId: string): Promise<EnvironmentVariable[]>;
    setEnvironmentVariable(environmentId: string, key: string, value: string, isSecret?: boolean): Promise<EnvironmentVariable>;
    deleteEnvironmentVariable(environmentId: string, key: string): Promise<boolean>;
}
//# sourceMappingURL=EnvironmentStore.d.ts.map