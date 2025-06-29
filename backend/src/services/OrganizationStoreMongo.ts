import { Db, Collection } from 'mongodb';
import { Organization, Team, TeamUser, TeamUserWithDetails, User } from '../../../shared/src/types';
import { v4 as uuidv4 } from 'uuid';
import { UserStoreMongo } from './UserStoreMongo';

export class OrganizationStoreMongo {
  private db: Db;
  private organizations: Collection<Organization>;
  private teams: Collection<Team>;
  private teamUsers: Collection<TeamUser>;
  private users: Collection<User>;
  private userStore: UserStoreMongo;

  constructor(db: Db, userStore: UserStoreMongo) {
    this.db = db;
    this.organizations = db.collection<Organization>('organizations');
    this.teams = db.collection<Team>('teams');
    this.teamUsers = db.collection<TeamUser>('teamUsers');
    this.users = db.collection<User>('users');
    this.userStore = userStore;
  }

  // Organization methods
  async createOrganization(data: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>): Promise<Organization> {
    const organization: Organization = {
      ...data,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.organizations.insertOne(organization);
    return organization;
  }

  async getOrganization(id: string): Promise<Organization | null> {
    return this.organizations.findOne({ id });
  }

  async getOrganizations(): Promise<Organization[]> {
    return this.organizations.find({}).toArray();
  }

  async updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization | null> {
    const result = await this.organizations.findOneAndUpdate(
      { id },
      { 
        $set: {
          ...updates,
          updatedAt: new Date(),
        }
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  async deleteOrganization(id: string): Promise<boolean> {
    // Delete all teams in the organization
    const teams = await this.getTeamsByOrganization(id);
    for (const team of teams) {
      await this.deleteTeam(team.id);
    }

    const result = await this.organizations.deleteOne({ id });
    return result.deletedCount > 0;
  }

  // Team methods
  async createTeam(data: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>): Promise<Team> {
    const team: Team = {
      ...data,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.teams.insertOne(team);
    return team;
  }

  async getTeam(id: string): Promise<Team | null> {
    return this.teams.findOne({ id });
  }

  async getTeamsByOrganization(organizationId: string): Promise<Team[]> {
    return this.teams.find({ organizationId }).toArray();
  }

  async updateTeam(id: string, updates: Partial<Team>): Promise<Team | null> {
    const result = await this.teams.findOneAndUpdate(
      { id },
      { 
        $set: {
          ...updates,
          updatedAt: new Date(),
        }
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  async deleteTeam(id: string): Promise<boolean> {
    // Delete all team users
    await this.teamUsers.deleteMany({ teamId: id });

    const result = await this.teams.deleteOne({ id });
    return result.deletedCount > 0;
  }

  // Team user methods
  async addUserToTeam(teamId: string, userId: string, role: 'owner' | 'admin' | 'member' | 'viewer'): Promise<TeamUser> {
    // Check if user is already in team
    const existing = await this.teamUsers.findOne({ teamId, userId });
    if (existing) {
      // Update role if different
      if (existing.role !== role) {
        const updated = await this.teamUsers.findOneAndUpdate(
          { id: existing.id },
          { 
            $set: { 
              role,
              updatedAt: new Date(),
            }
          },
          { returnDocument: 'after' }
        );
        return updated!;
      }
      return existing;
    }

    const teamUser: TeamUser = {
      id: uuidv4(),
      teamId,
      userId,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.teamUsers.insertOne(teamUser);
    return teamUser;
  }

  async removeUserFromTeam(teamId: string, userId: string): Promise<boolean> {
    const result = await this.teamUsers.deleteOne({ teamId, userId });
    return result.deletedCount > 0;
  }

  async getTeamUsers(teamId: string): Promise<TeamUser[]> {
    return this.teamUsers.find({ teamId }).toArray();
  }

  async getTeamUsersWithDetails(teamId: string): Promise<TeamUserWithDetails[]> {
    const teamUsers = await this.teamUsers.find({ teamId }).toArray();
    
    const enrichedUsers: TeamUserWithDetails[] = [];
    for (const teamUser of teamUsers) {
      const user = await this.userStore.getUserById(teamUser.userId);
      if (user) {
        enrichedUsers.push({
          ...teamUser,
          user: {
            email: user.email,
            name: user.name
          }
        });
      }
    }
    
    return enrichedUsers;
  }

  async getUserTeams(userId: string): Promise<TeamUser[]> {
    return this.teamUsers.find({ userId }).toArray();
  }

  async updateTeamUserRole(teamId: string, userId: string, role: 'owner' | 'admin' | 'member' | 'viewer'): Promise<TeamUser | null> {
    const result = await this.teamUsers.findOneAndUpdate(
      { teamId, userId },
      { 
        $set: {
          role,
          updatedAt: new Date(),
        }
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  async isUserInOrganization(userId: string, organizationId: string): Promise<boolean> {
    const teams = await this.getTeamsByOrganization(organizationId);
    for (const team of teams) {
      const teamUser = await this.teamUsers.findOne({ teamId: team.id, userId });
      if (teamUser) return true;
    }
    return false;
  }

  async getUserOrganizationRole(userId: string, organizationId: string): Promise<string | null> {
    const teams = await this.getTeamsByOrganization(organizationId);
    let highestRole: string | null = null;
    const roleHierarchy = { owner: 4, admin: 3, member: 2, viewer: 1 };

    for (const team of teams) {
      const teamUser = await this.teamUsers.findOne({ teamId: team.id, userId });
      if (teamUser) {
        if (!highestRole || roleHierarchy[teamUser.role as keyof typeof roleHierarchy] > roleHierarchy[highestRole as keyof typeof roleHierarchy]) {
          highestRole = teamUser.role;
        }
      }
    }

    return highestRole;
  }

  async getUserOrganizations(userId: string): Promise<Organization[]> {
    // Get all teams the user belongs to
    const userTeams = await this.teamUsers.find({ userId }).toArray();
    
    // Get unique organization IDs from the teams
    const orgIds = new Set<string>();
    for (const userTeam of userTeams) {
      const team = await this.teams.findOne({ id: userTeam.teamId });
      if (team) {
        orgIds.add(team.organizationId);
      }
    }
    
    // Get all organizations the user belongs to
    const organizations = await this.organizations
      .find({ id: { $in: Array.from(orgIds) } })
      .toArray();
      
    return organizations;
  }
}