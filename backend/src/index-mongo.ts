import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import axios from 'axios';
import { MongoDB } from './db/mongodb';
import { FlowStore } from './services/FlowStoreMongo';
import { EnvironmentStore } from './services/EnvironmentStoreMongo';
import { ProjectStore } from './services/ProjectStoreMongo';
import { UserStoreMongo } from './services/UserStoreMongo';
import { OrganizationStoreMongo } from './services/OrganizationStoreMongo';
import { TestRunStoreMongo } from './services/TestRunStoreMongo';
import { AuthService } from './services/AuthService';
import { ApiTokenServiceMongo } from './services/ApiTokenServiceMongo';
import { TestRunner } from './services/TestRunner';
import { flowRoutes } from './routes/flows-mongo';
import { runRoutes } from './routes/runs';
import { environmentRoutes } from './routes/environments-mongo';
import { projectRoutes } from './routes/projects-mongo';
import { organizationRoutes } from './routes/organizations-mongo';
import { authRoutes } from './routes/authRoutes';
import { apiTokenRoutes } from './routes/apiTokenRoutes';
import { authMiddleware } from './middleware/auth';
import { combinedAuth } from './middleware/combinedAuth';

async function startServer() {
  // Initialize MongoDB connection
  const mongodb = new MongoDB();
  await mongodb.connect();

  // Initialize stores with MongoDB
  const flowStore = new FlowStore(mongodb);
  const environmentStore = new EnvironmentStore(mongodb);
  const projectStore = new ProjectStore(mongodb);
  const userStore = new UserStoreMongo(mongodb.db);
  const organizationStore = new OrganizationStoreMongo(mongodb.db, userStore);
  const runStore = new TestRunStoreMongo(mongodb.db);
  const authService = new AuthService();
  const apiTokenService = new ApiTokenServiceMongo(mongodb.db);

  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST']
    }
  });

  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use(cookieParser());

  const testRunner = new TestRunner(io, flowStore, environmentStore, runStore);

  const API_BASE_PATH = process.env.API_BASE_PATH || '/api';

  // Auth routes (no auth required)
  app.use(`${API_BASE_PATH}/auth`, authRoutes(authService, userStore, organizationStore));

  // Protected routes (auth required - supports both JWT and API tokens)
  const auth = combinedAuth(authService, apiTokenService);
  app.use(`${API_BASE_PATH}/flows`, auth, flowRoutes(flowStore, projectStore, organizationStore));
  app.use(`${API_BASE_PATH}/runs`, auth, runRoutes(testRunner, flowStore, projectStore, runStore));
  app.use(`${API_BASE_PATH}/environments`, auth, environmentRoutes(environmentStore));
  app.use(`${API_BASE_PATH}/projects`, auth, projectRoutes(projectStore, flowStore, organizationStore));
  app.use(`${API_BASE_PATH}/organizations`, auth, organizationRoutes(organizationStore));
  app.use(`${API_BASE_PATH}/api-tokens`, auth, apiTokenRoutes(apiTokenService));

  // Proxy endpoint for external API requests (CORS workaround)
  app.get(`${API_BASE_PATH}/proxy`, async (req, res) => {
    const { url } = req.query;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    try {
      const response = await axios.get(url, {
        responseType: 'text',
        validateStatus: () => true, // Accept any status code
      });
      
      // Set appropriate headers
      const contentType = response.headers['content-type'] || 'application/json';
      res.set('Content-Type', contentType);
      res.status(response.status).send(response.data);
    } catch (error) {
      console.error('Proxy request failed:', error);
      res.status(500).json({ error: 'Failed to fetch external resource' });
    }
  });

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