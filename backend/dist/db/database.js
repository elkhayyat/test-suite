"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabase = getDatabase;
exports.closeDatabase = closeDatabase;
const sqlite3_1 = __importDefault(require("sqlite3"));
const sqlite_1 = require("sqlite");
const path_1 = __importDefault(require("path"));
let db = null;
async function getDatabase() {
    if (!db) {
        db = await (0, sqlite_1.open)({
            filename: path_1.default.join(__dirname, '../../data/flows.db'),
            driver: sqlite3_1.default.Database
        });
        await initializeDatabase();
    }
    return db;
}
async function initializeDatabase() {
    const db = await getDatabase();
    await db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      parent_id TEXT,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE,
      UNIQUE(project_id, parent_id, name)
    );

    CREATE TABLE IF NOT EXISTS flows (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      folder_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      nodes TEXT NOT NULL,
      edges TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS environments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      is_default BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS environment_variables (
      id TEXT PRIMARY KEY,
      environment_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      is_secret BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE,
      UNIQUE(environment_id, key)
    );

    CREATE TABLE IF NOT EXISTS flow_environment_configs (
      id TEXT PRIMARY KEY,
      flow_id TEXT NOT NULL,
      environment_id TEXT NOT NULL,
      step_id TEXT NOT NULL,
      config_overrides TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (flow_id) REFERENCES flows(id) ON DELETE CASCADE,
      FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE,
      UNIQUE(flow_id, environment_id, step_id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'tester',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS project_users (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(project_id, user_id)
    );
  `);
    // Create default environment if none exists
    const defaultEnv = await db.get('SELECT id FROM environments WHERE is_default = TRUE');
    if (!defaultEnv) {
        await db.run('INSERT INTO environments (id, name, description, is_default) VALUES (?, ?, ?, ?)', ['default', 'Default', 'Default environment', true]);
    }
    // Create default project if none exists
    const defaultProject = await db.get('SELECT id FROM projects WHERE name = ?', 'Default Project');
    if (!defaultProject) {
        await db.run('INSERT INTO projects (id, name, description) VALUES (?, ?, ?)', ['default', 'Default Project', 'Default project for all flows']);
    }
    // Create default admin user if none exists
    const adminUser = await db.get('SELECT id FROM users WHERE email = ?', 'admin@example.com');
    if (!adminUser) {
        // Note: In a real app, this would be hashed properly
        await db.run('INSERT INTO users (id, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?)', ['admin', 'admin@example.com', 'Admin User', 'admin123', 'admin']);
        // Add admin to default project
        await db.run('INSERT INTO project_users (id, project_id, user_id, role) VALUES (?, ?, ?, ?)', ['admin-default', 'default', 'admin', 'owner']);
    }
}
async function closeDatabase() {
    if (db) {
        await db.close();
        db = null;
    }
}
//# sourceMappingURL=database.js.map