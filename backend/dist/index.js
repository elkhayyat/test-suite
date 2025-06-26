"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const flows_1 = require("./routes/flows");
const runs_1 = require("./routes/runs");
const environments_1 = require("./routes/environments");
const projects_1 = require("./routes/projects");
const organizations_1 = __importDefault(require("./routes/organizations"));
const TestRunner_1 = require("./services/TestRunner");
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
const testRunner = new TestRunner_1.TestRunner(io, flows_1.flowStore);
app.use('/api/flows', flows_1.flowRoutes);
app.use('/api/runs', (0, runs_1.runRoutes)(testRunner));
app.use('/api/environments', environments_1.environmentRoutes);
app.use('/api/projects', projects_1.projectRoutes);
app.use('/api/organizations', organizations_1.default);
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map