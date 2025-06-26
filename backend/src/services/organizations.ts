import { v4 as uuidv4 } from 'uuid';
import { Organization, Team, TeamUser, ProjectTeam } from '../../../shared/src/types';
import { getDB } from '../db/mongodb';

export async function getOrganizations(): Promise<Organization[]> {
  const db = await getDB();
  return await db.organizations.find({}).toArray();
}

export async function getOrganization(id: string): Promise<Organization | null> {
  const db = await getDB();
  return await db.organizations.findOne({ id });
}

export async function createOrganization(data: Partial<Organization>): Promise<Organization> {
  try {
    console.log('Creating organization with data:', data);
    const db = await getDB();
    const organization: Organization = {
      id: uuidv4(),
      name: data.name || 'New Organization',
      description: data.description,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    console.log('Inserting organization:', organization);
    await db.organizations.insertOne(organization);
    console.log('Organization created successfully:', organization.id);
    
    // Verify the organization was saved
    const savedOrg = await db.organizations.findOne({ id: organization.id });
    if (!savedOrg) {
      throw new Error('Organization was not saved properly');
    }
    
    return organization;
  } catch (error) {
    console.error('Error creating organization:', error);
    throw error;
  }
}

export async function updateOrganization(id: string, data: Partial<Organization>): Promise<Organization | null> {
  const db = await getDB();
  const updateData = {
    ...data,
    updatedAt: new Date(),
  };
  delete updateData.id;
  delete updateData.createdAt;
  
  const result = await db.organizations.findOneAndUpdate(
    { id },
    { $set: updateData },
    { returnDocument: 'after' }
  );
  
  return result;
}

export async function deleteOrganization(id: string): Promise<boolean> {
  const db = await getDB();
  
  // Check if there are any teams in this organization
  const teamCount = await db.teams.countDocuments({ organizationId: id });
  if (teamCount > 0) {
    throw new Error('Cannot delete organization with existing teams');
  }
  
  // Check if there are any projects in this organization
  const projectCount = await db.projects.countDocuments({ organizationId: id });
  if (projectCount > 0) {
    throw new Error('Cannot delete organization with existing projects');
  }
  
  const result = await db.organizations.deleteOne({ id });
  return result.deletedCount > 0;
}

// Team management
export async function getTeams(organizationId: string): Promise<Team[]> {
  const db = await getDB();
  return await db.teams.find({ organizationId }).toArray();
}

export async function getTeam(id: string): Promise<Team | null> {
  const db = await getDB();
  return await db.teams.findOne({ id });
}

export async function createTeam(organizationId: string, data: Partial<Team>): Promise<Team> {
  const db = await getDB();
  const team: Team = {
    id: uuidv4(),
    organizationId,
    name: data.name || 'New Team',
    description: data.description,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  await db.teams.insertOne(team);
  return team;
}

export async function updateTeam(id: string, data: Partial<Team>): Promise<Team | null> {
  const db = await getDB();
  const updateData = {
    ...data,
    updatedAt: new Date(),
  };
  delete updateData.id;
  delete updateData.organizationId;
  delete updateData.createdAt;
  
  const result = await db.teams.findOneAndUpdate(
    { id },
    { $set: updateData },
    { returnDocument: 'after' }
  );
  
  return result;
}

export async function deleteTeam(id: string): Promise<boolean> {
  const db = await getDB();
  
  // Delete all team users
  await db.teamUsers.deleteMany({ teamId: id });
  
  // Delete all project team associations
  await db.projectTeams.deleteMany({ teamId: id });
  
  const result = await db.teams.deleteOne({ id });
  return result.deletedCount > 0;
}

// Team user management
export async function getTeamUsers(teamId: string): Promise<TeamUser[]> {
  const db = await getDB();
  return await db.teamUsers.find({ teamId }).toArray();
}

export async function addUserToTeam(teamId: string, userId: string, role: TeamUser['role']): Promise<TeamUser> {
  const db = await getDB();
  const teamUser: TeamUser = {
    id: uuidv4(),
    teamId,
    userId,
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  await db.teamUsers.insertOne(teamUser);
  return teamUser;
}

export async function updateTeamUserRole(teamId: string, userId: string, role: TeamUser['role']): Promise<TeamUser | null> {
  const db = await getDB();
  const result = await db.teamUsers.findOneAndUpdate(
    { teamId, userId },
    { $set: { role, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );
  
  return result;
}

export async function removeUserFromTeam(teamId: string, userId: string): Promise<boolean> {
  const db = await getDB();
  const result = await db.teamUsers.deleteOne({ teamId, userId });
  return result.deletedCount > 0;
}

// Project team management
export async function getProjectTeams(projectId: string): Promise<ProjectTeam[]> {
  const db = await getDB();
  return await db.projectTeams.find({ projectId }).toArray();
}

export async function addTeamToProject(projectId: string, teamId: string, permissions: ProjectTeam['permissions']): Promise<ProjectTeam> {
  const db = await getDB();
  const projectTeam: ProjectTeam = {
    id: uuidv4(),
    projectId,
    teamId,
    permissions,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  await db.projectTeams.insertOne(projectTeam);
  return projectTeam;
}

export async function updateProjectTeamPermissions(projectId: string, teamId: string, permissions: ProjectTeam['permissions']): Promise<ProjectTeam | null> {
  const db = await getDB();
  const result = await db.projectTeams.findOneAndUpdate(
    { projectId, teamId },
    { $set: { permissions, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );
  
  return result;
}

export async function removeTeamFromProject(projectId: string, teamId: string): Promise<boolean> {
  const db = await getDB();
  const result = await db.projectTeams.deleteOne({ projectId, teamId });
  return result.deletedCount > 0;
}

// Helper function to check if a user has access to a project through teams
export async function userHasProjectAccess(userId: string, projectId: string): Promise<boolean> {
  const db = await getDB();
  
  // Get all teams the user belongs to
  const userTeams = await db.teamUsers.find({ userId }).toArray();
  const teamIds = userTeams.map(ut => ut.teamId);
  
  if (teamIds.length === 0) {
    return false;
  }
  
  // Check if any of those teams have access to the project
  const projectTeam = await db.projectTeams.findOne({
    projectId,
    teamId: { $in: teamIds }
  });
  
  return projectTeam !== null;
}

// Get all projects a user has access to through their teams
export async function getUserProjects(userId: string): Promise<string[]> {
  const db = await getDB();
  
  // Get all teams the user belongs to
  const userTeams = await db.teamUsers.find({ userId }).toArray();
  const teamIds = userTeams.map(ut => ut.teamId);
  
  if (teamIds.length === 0) {
    return [];
  }
  
  // Get all projects those teams have access to
  const projectTeams = await db.projectTeams.find({
    teamId: { $in: teamIds }
  }).toArray();
  
  return [...new Set(projectTeams.map(pt => pt.projectId))];
}