import { MongoClient, Db, Collection } from 'mongodb';
import { TestFlow, TestRun, Environment, EnvironmentVariable, Project, Folder, User, Organization, Team, TeamUser, ProjectTeam, ProjectOpenAPISchema } from '../../../shared/src/types';

export interface DbCollections {
  flows: Collection<TestFlow>;
  runs: Collection<TestRun>;
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
  projectOpenAPISchemas: Collection<ProjectOpenAPISchema>;
}

export class MongoDB {
  private client: MongoClient;
  public db: Db;  // Made public to fix compilation error
  private collections: DbCollections;

  constructor() {
    // Use auth connection string for production, simple connection for development
    const mongoUrl = process.env.MONGODB_URL || 'mongodb://app_user:app_password@localhost:27017/test-flow-suite';
    
    this.client = new MongoClient(mongoUrl);
    
    // Extract database name from connection string or use default
    const dbName = process.env.MONGODB_DB_NAME || mongoUrl.split('/').pop()?.split('?')[0] || 'test-flow-suite';
    this.db = this.client.db(dbName);
    
    // Initialize collections
    this.collections = {
      flows: this.db.collection<TestFlow>('flows'),
      runs: this.db.collection<TestRun>('runs'),
      environments: this.db.collection<Environment>('environments'),
      environmentVariables: this.db.collection<EnvironmentVariable>('environmentVariables'),
      projects: this.db.collection<Project>('projects'),
      folders: this.db.collection<Folder>('folders'),
      users: this.db.collection<User>('users'),
      projectUsers: this.db.collection('projectUsers'),
      organizations: this.db.collection<Organization>('organizations'),
      teams: this.db.collection<Team>('teams'),
      teamUsers: this.db.collection<TeamUser>('teamUsers'),
      projectTeams: this.db.collection<ProjectTeam>('projectTeams'),
      projectOpenAPISchemas: this.db.collection<ProjectOpenAPISchema>('projectOpenAPISchemas'),
    };
  }

  async connect(): Promise<void> {
    try {
      console.log('Attempting to connect to MongoDB...');
      await this.client.connect();
      console.log('Connected to MongoDB successfully');
      
      // Test the connection
      await this.db.admin().ping();
      console.log('MongoDB ping successful');
      
      // Create indexes
      await this.createIndexes();
      console.log('MongoDB indexes created');
      
      // Initialize default data
      await this.initializeDefaultData();
      console.log('MongoDB default data initialized');
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      console.error('Make sure MongoDB is running and credentials are correct');
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  private async createIndexes(): Promise<void> {
    // Flows indexes
    await this.collections.flows.createIndex({ projectId: 1 });
    await this.collections.flows.createIndex({ folderId: 1 });
    await this.collections.flows.createIndex({ name: 1, projectId: 1 });
    
    // Test runs indexes
    await this.collections.runs.createIndex({ organizationId: 1, startTime: -1 });
    await this.collections.runs.createIndex({ flowId: 1 });
    await this.collections.runs.createIndex({ userId: 1 });
    await this.collections.runs.createIndex({ status: 1 });
    
    // Environment indexes
    await this.collections.environments.createIndex({ organizationId: 1 });
    await this.collections.environments.createIndex({ name: 1, organizationId: 1 }, { unique: true });
    await this.collections.environments.createIndex({ isDefault: 1 });
    
    // Environment variables indexes
    await this.collections.environmentVariables.createIndex({ environmentId: 1, key: 1 }, { unique: true });
    
    // Projects indexes
    await this.collections.projects.createIndex({ organizationId: 1 });
    await this.collections.projects.createIndex({ name: 1, organizationId: 1 }, { unique: true });
    
    // Folders indexes
    await this.collections.folders.createIndex({ projectId: 1 });
    await this.collections.folders.createIndex({ name: 1, projectId: 1 }, { unique: true });
    
    // Users indexes
    await this.collections.users.createIndex({ email: 1 }, { unique: true });
    
    // Project users indexes
    await this.collections.projectUsers.createIndex({ projectId: 1, userId: 1 }, { unique: true });
    
    // Organizations indexes
    await this.collections.organizations.createIndex({ name: 1 }, { unique: true });
    
    // Teams indexes
    await this.collections.teams.createIndex({ organizationId: 1 });
    await this.collections.teams.createIndex({ name: 1, organizationId: 1 }, { unique: true });
    
    // Team users indexes
    await this.collections.teamUsers.createIndex({ teamId: 1, userId: 1 }, { unique: true });
    await this.collections.teamUsers.createIndex({ userId: 1 });
    
    // Project teams indexes
    await this.collections.projectTeams.createIndex({ projectId: 1, teamId: 1 }, { unique: true });
    await this.collections.projectTeams.createIndex({ teamId: 1 });
    
    // Project OpenAPI schemas indexes
    await this.collections.projectOpenAPISchemas.createIndex({ projectId: 1 });
    await this.collections.projectOpenAPISchemas.createIndex({ name: 1, projectId: 1 }, { unique: true });
  }

  private async initializeDefaultData(): Promise<void> {
    // Check if we have any organizations
    const orgCount = await this.collections.organizations.countDocuments();
    let defaultOrgId = 'default-org';
    if (orgCount === 0) {
      // Create default organization
      await this.collections.organizations.insertOne({
        id: defaultOrgId,
        name: 'Default Organization',
        description: 'Default organization',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    
    // Check if we have any environments
    const envCount = await this.collections.environments.countDocuments();
    if (envCount === 0) {
      // Create default environment
      await this.collections.environments.insertOne({
        id: 'default',
        organizationId: defaultOrgId,
        name: 'Default',
        description: 'Default environment',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      // Add default environment variables
      const defaultVariables = [
        {
          id: 'var-baseurl',
          environmentId: 'default',
          key: 'baseUrl',
          value: 'https://jsonplaceholder.typicode.com',
          isSecret: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'var-apiurl',
          environmentId: 'default',
          key: 'apiUrl',
          value: 'https://api.example.com',
          isSecret: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'var-localhost',
          environmentId: 'default',
          key: 'localhost',
          value: 'http://localhost:3000',
          isSecret: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'var-token',
          environmentId: 'default',
          key: 'authToken',
          value: 'your-api-token-here',
          isSecret: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ];
      
      await this.collections.environmentVariables.insertMany(defaultVariables);
    }

    // Check if we have any users
    const userCount = await this.collections.users.countDocuments();
    if (userCount === 0) {
      // Create default admin user
      await this.collections.users.insertOne({
        id: 'admin',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
        organizationId: defaultOrgId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Check if we have any projects
    const projectCount = await this.collections.projects.countDocuments();
    if (projectCount === 0) {
      // Create default project
      const defaultProject = {
        id: 'default',
        organizationId: defaultOrgId,
        name: 'Default Project',
        description: 'Default project for test flows',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await this.collections.projects.insertOne(defaultProject);
      
      // Create default team
      const defaultTeamId = 'default-team';
      await this.collections.teams.insertOne({
        id: defaultTeamId,
        organizationId: defaultOrgId,
        name: 'Default Team',
        description: 'Default team',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      // Add admin user to default team
      await this.collections.teamUsers.insertOne({
        id: `${defaultTeamId}-admin`,
        teamId: defaultTeamId,
        userId: 'admin',
        role: 'owner',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      // Associate default team with default project
      await this.collections.projectTeams.insertOne({
        id: `${defaultProject.id}-${defaultTeamId}`,
        projectId: defaultProject.id,
        teamId: defaultTeamId,
        permissions: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      // Add admin user to default project (for backwards compatibility)
      await this.collections.projectUsers.insertOne({
        projectId: 'default',
        userId: 'admin',
        role: 'admin',
        createdAt: new Date(),
      });
    }
  }

  getCollections(): DbCollections {
    return this.collections;
  }

  getDb(): Db {
    return this.db;
  }
}

// Singleton instance
let dbInstance: MongoDB | null = null;

export async function getDB(): Promise<DbCollections> {
  if (!dbInstance) {
    dbInstance = new MongoDB();
    await dbInstance.connect();
  }
  return dbInstance.getCollections();
}