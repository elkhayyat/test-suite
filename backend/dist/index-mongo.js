"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const mongodb_1 = require("./db/mongodb");
const FlowStoreMongo_1 = require("./services/FlowStoreMongo");
const EnvironmentStoreMongo_1 = require("./services/EnvironmentStoreMongo");
const ProjectStoreMongo_1 = require("./services/ProjectStoreMongo");
const TestRunner_1 = require("./services/TestRunner");
const flows_mongo_1 = require("./routes/flows-mongo");
const runs_1 = require("./routes/runs");
const environments_mongo_1 = require("./routes/environments-mongo");
const projects_mongo_1 = require("./routes/projects-mongo");
const organizations_1 = __importDefault(require("./routes/organizations"));
async function startServer() {
    // Initialize MongoDB connection
    const mongodb = new mongodb_1.MongoDB();
    await mongodb.connect();
    // Initialize stores with MongoDB
    const flowStore = new FlowStoreMongo_1.FlowStore(mongodb);
    const environmentStore = new EnvironmentStoreMongo_1.EnvironmentStore(mongodb);
    const projectStore = new ProjectStoreMongo_1.ProjectStore(mongodb);
    const app = (0, express_1.default)();
    const httpServer = (0, http_1.createServer)(app);
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: 'http://localhost:3000',
            methods: ['GET', 'POST']
        }
    });
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    const testRunner = new TestRunner_1.TestRunner(io, flowStore);
    // Setup routes with stores
    app.use('/api/flows', (0, flows_mongo_1.flowRoutes)(flowStore));
    app.use('/api/runs', (0, runs_1.runRoutes)(testRunner));
    app.use('/api/environments', (0, environments_mongo_1.environmentRoutes)(environmentStore));
    app.use('/api/projects', (0, projects_mongo_1.projectRoutes)(projectStore));
    app.use('/api/organizations', organizations_1.default);
    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);
        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });
    const PORT = process.env.PORT || 3001;
    httpServer.listen(PORT, () => {
        console.log(`Server running on port ${PORT} with MongoDB`);
    });
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('Shutting down server...');
        await mongodb.disconnect();
        process.exit(0);
    });
}
// Start the server
startServer().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
//# sourceMappingURL=index-mongo.js.map