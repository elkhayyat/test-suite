import { Db, Collection } from 'mongodb';
import { TestFlow, Environment, EnvironmentVariable, Project, Folder, User, Organization, Team, TeamUser, ProjectTeam } from '../../../shared/src/types';
export interface DbCollections {
    flows: Collection<TestFlow>;
    environments: Collection<Environment>;
    environmentVariables: Collection<EnvironmentVariable>;
    projects: Collection<Project>;
    folders: Collection<Folder>;
    users: Collection<User>;
    projectUsers: Collection<any>;
    organizations: Collection<Organization>;
    teams: Collection<Team>;
    teamUsers: Collection<TeamUser>;
    projectTeams: Collection<ProjectTeam>;
}
export declare class MongoDB {
    private client;
    private db;
    private collections;
    constructor();
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    private createIndexes;
    private initializeDefaultData;
    getCollections(): DbCollections;
    getDb(): Db;
}
export declare function getDB(): Promise<DbCollections>;
//# sourceMappingURL=mongodb.d.ts.map