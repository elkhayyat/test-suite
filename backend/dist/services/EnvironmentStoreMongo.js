"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvironmentStore = void 0;
const uuid_1 = require("uuid");
class EnvironmentStore {
    mongodb;
    constructor(mongodb) {
        this.mongodb = mongodb;
    }
    async getEnvironments() {
        try {
            const collections = this.mongodb.getCollections();
            const environments = await collections.environments.find({}).toArray();
            return environments;
        }
        catch (error) {
            console.error('Failed to get environments:', error);
            return [];
        }
    }
    async getEnvironment(id) {
        try {
            const collections = this.mongodb.getCollections();
            const environment = await collections.environments.findOne({ id });
            return environment || undefined;
        }
        catch (error) {
            console.error('Failed to get environment:', error);
            return undefined;
        }
    }
    async createEnvironment(data) {
        const environment = {
            id: data.id || (0, uuid_1.v4)(),
            name: data.name || 'New Environment',
            description: data.description,
            isDefault: data.isDefault || false,
            createdAt: data.createdAt || new Date(),
            updatedAt: data.updatedAt || new Date(),
        };
        try {
            const collections = this.mongodb.getCollections();
            // If this is set as default, unset any existing defaults
            if (environment.isDefault) {
                await collections.environments.updateMany({ isDefault: true }, { $set: { isDefault: false } });
            }
            await collections.environments.insertOne(environment);
            return environment;
        }
        catch (error) {
            console.error('Failed to create environment:', error);
            throw error;
        }
    }
    async updateEnvironment(id, data) {
        try {
            const collections = this.mongodb.getCollections();
            const updateData = {
                ...data,
                updatedAt: new Date(),
            };
            // Remove id from update data
            delete updateData.id;
            // If setting as default, unset any existing defaults
            if (updateData.isDefault) {
                await collections.environments.updateMany({ isDefault: true, id: { $ne: id } }, { $set: { isDefault: false } });
            }
            const result = await collections.environments.findOneAndUpdate({ id }, { $set: updateData }, { returnDocument: 'after' });
            return result || undefined;
        }
        catch (error) {
            console.error('Failed to update environment:', error);
            return undefined;
        }
    }
    async deleteEnvironment(id) {
        try {
            const collections = this.mongodb.getCollections();
            // Delete all variables for this environment
            await collections.environmentVariables.deleteMany({ environmentId: id });
            // Delete the environment
            const result = await collections.environments.deleteOne({ id });
            return result.deletedCount > 0;
        }
        catch (error) {
            console.error('Failed to delete environment:', error);
            return false;
        }
    }
    async getEnvironmentVariables(environmentId) {
        try {
            console.log('Getting environment variables for environment:', environmentId);
            const collections = this.mongodb.getCollections();
            const variables = await collections.environmentVariables.find({ environmentId }).toArray();
            console.log(`Found ${variables.length} variables:`, variables.map(v => ({ key: v.key, value: v.isSecret ? '[HIDDEN]' : v.value })));
            return variables;
        }
        catch (error) {
            console.error('Failed to get environment variables:', error);
            return [];
        }
    }
    async setEnvironmentVariable(environmentId, key, value, isSecret = false) {
        try {
            const collections = this.mongodb.getCollections();
            const variable = {
                id: (0, uuid_1.v4)(),
                environmentId,
                key,
                value,
                isSecret,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            // Upsert the variable (update if exists, insert if not)
            await collections.environmentVariables.replaceOne({ environmentId, key }, variable, { upsert: true });
            return variable;
        }
        catch (error) {
            console.error('Failed to set environment variable:', error);
            throw error;
        }
    }
    async deleteEnvironmentVariable(environmentId, key) {
        try {
            const collections = this.mongodb.getCollections();
            const result = await collections.environmentVariables.deleteOne({ environmentId, key });
            return result.deletedCount > 0;
        }
        catch (error) {
            console.error('Failed to delete environment variable:', error);
            return false;
        }
    }
}
exports.EnvironmentStore = EnvironmentStore;
//# sourceMappingURL=EnvironmentStoreMongo.js.map