import { Environment, EnvironmentVariable } from '../../../shared/src/types';
import { MongoDB } from '../db/mongodb';
export declare class EnvironmentStore {
    private mongodb;
    constructor(mongodb: MongoDB);
    getEnvironments(): Promise<Environment[]>;
    getEnvironment(id: string): Promise<Environment | undefined>;
    createEnvironment(data: Partial<Environment>): Promise<Environment>;
    updateEnvironment(id: string, data: Partial<Environment>): Promise<Environment | undefined>;
    deleteEnvironment(id: string): Promise<boolean>;
    getEnvironmentVariables(environmentId: string): Promise<EnvironmentVariable[]>;
    setEnvironmentVariable(environmentId: string, key: string, value: string, isSecret?: boolean): Promise<EnvironmentVariable>;
    deleteEnvironmentVariable(environmentId: string, key: string): Promise<boolean>;
}
//# sourceMappingURL=EnvironmentStoreMongo.d.ts.map