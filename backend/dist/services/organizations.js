"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrganizations = getOrganizations;
exports.getOrganization = getOrganization;
exports.createOrganization = createOrganization;
exports.updateOrganization = updateOrganization;
exports.deleteOrganization = deleteOrganization;
exports.getTeams = getTeams;
exports.getTeam = getTeam;
exports.createTeam = createTeam;
exports.updateTeam = updateTeam;
exports.deleteTeam = deleteTeam;
exports.getTeamUsers = getTeamUsers;
exports.addUserToTeam = addUserToTeam;
exports.updateTeamUserRole = updateTeamUserRole;
exports.removeUserFromTeam = removeUserFromTeam;
exports.getProjectTeams = getProjectTeams;
exports.addTeamToProject = addTeamToProject;
exports.updateProjectTeamPermissions = updateProjectTeamPermissions;
exports.removeTeamFromProject = removeTeamFromProject;
exports.userHasProjectAccess = userHasProjectAccess;
exports.getUserProjects = getUserProjects;
const uuid_1 = require("uuid");
const mongodb_1 = require("../db/mongodb");
async function getOrganizations() {
    const db = await (0, mongodb_1.getDB)();
    return await db.organizations.find({}).toArray();
}
async function getOrganization(id) {
    const db = await (0, mongodb_1.getDB)();
    return await db.organizations.findOne({ id });
}
async function createOrganization(data) {
    try {
        console.log('Creating organization with data:', data);
        const db = await (0, mongodb_1.getDB)();
        const organization = {
            id: (0, uuid_1.v4)(),
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
    }
    catch (error) {
        console.error('Error creating organization:', error);
        throw error;
    }
}
async function updateOrganization(id, data) {
    const db = await (0, mongodb_1.getDB)();
    const updateData = {
        ...data,
        updatedAt: new Date(),
    };
    delete updateData.id;
    delete updateData.createdAt;
    const result = await db.organizations.findOneAndUpdate({ id }, { $set: updateData }, { returnDocument: 'after' });
    return result;
}
async function deleteOrganization(id) {
    const db = await (0, mongodb_1.getDB)();
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
async function getTeams(organizationId) {
    const db = await (0, mongodb_1.getDB)();
    return await db.teams.find({ organizationId }).toArray();
}
async function getTeam(id) {
    const db = await (0, mongodb_1.getDB)();
    return await db.teams.findOne({ id });
}
async function createTeam(organizationId, data) {
    const db = await (0, mongodb_1.getDB)();
    const team = {
        id: (0, uuid_1.v4)(),
        organizationId,
        name: data.name || 'New Team',
        description: data.description,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    await db.teams.insertOne(team);
    return team;
}
async function updateTeam(id, data) {
    const db = await (0, mongodb_1.getDB)();
    const updateData = {
        ...data,
        updatedAt: new Date(),
    };
    delete updateData.id;
    delete updateData.organizationId;
    delete updateData.createdAt;
    const result = await db.teams.findOneAndUpdate({ id }, { $set: updateData }, { returnDocument: 'after' });
    return result;
}
async function deleteTeam(id) {
    const db = await (0, mongodb_1.getDB)();
    // Delete all team users
    await db.teamUsers.deleteMany({ teamId: id });
    // Delete all project team associations
    await db.projectTeams.deleteMany({ teamId: id });
    const result = await db.teams.deleteOne({ id });
    return result.deletedCount > 0;
}
// Team user management
async function getTeamUsers(teamId) {
    const db = await (0, mongodb_1.getDB)();
    return await db.teamUsers.find({ teamId }).toArray();
}
async function addUserToTeam(teamId, userId, role) {
    const db = await (0, mongodb_1.getDB)();
    const teamUser = {
        id: (0, uuid_1.v4)(),
        teamId,
        userId,
        role,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    await db.teamUsers.insertOne(teamUser);
    return teamUser;
}
async function updateTeamUserRole(teamId, userId, role) {
    const db = await (0, mongodb_1.getDB)();
    const result = await db.teamUsers.findOneAndUpdate({ teamId, userId }, { $set: { role, updatedAt: new Date() } }, { returnDocument: 'after' });
    return result;
}
async function removeUserFromTeam(teamId, userId) {
    const db = await (0, mongodb_1.getDB)();
    const result = await db.teamUsers.deleteOne({ teamId, userId });
    return result.deletedCount > 0;
}
// Project team management
async function getProjectTeams(projectId) {
    const db = await (0, mongodb_1.getDB)();
    return await db.projectTeams.find({ projectId }).toArray();
}
async function addTeamToProject(projectId, teamId, permissions) {
    const db = await (0, mongodb_1.getDB)();
    const projectTeam = {
        id: (0, uuid_1.v4)(),
        projectId,
        teamId,
        permissions,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    await db.projectTeams.insertOne(projectTeam);
    return projectTeam;
}
async function updateProjectTeamPermissions(projectId, teamId, permissions) {
    const db = await (0, mongodb_1.getDB)();
    const result = await db.projectTeams.findOneAndUpdate({ projectId, teamId }, { $set: { permissions, updatedAt: new Date() } }, { returnDocument: 'after' });
    return result;
}
async function removeTeamFromProject(projectId, teamId) {
    const db = await (0, mongodb_1.getDB)();
    const result = await db.projectTeams.deleteOne({ projectId, teamId });
    return result.deletedCount > 0;
}
// Helper function to check if a user has access to a project through teams
async function userHasProjectAccess(userId, projectId) {
    const db = await (0, mongodb_1.getDB)();
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
async function getUserProjects(userId) {
    const db = await (0, mongodb_1.getDB)();
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
//# sourceMappingURL=organizations.js.map