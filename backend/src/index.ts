import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import axios from 'axios';
import { MongoDB } from './db/mongodb';
import { FlowStore } from './services/FlowStore';
import { EnvironmentStore } from './services/EnvironmentStore';
import { ProjectStore } from './services/ProjectStore';
import { UserStoreMongo } from './services/UserStoreMongo';
import { OrganizationStoreMongo } from './services/OrganizationStoreMongo';
import { TestRunStoreMongo } from './services/TestRunStoreMongo';
import { AuthService } from './services/AuthService';
import { ApiTokenServiceMongo } from './services/ApiTokenService';
import { TestRunner } from './services/TestRunner';
import { flowRoutes } from './routes/flows';
import { runRoutes } from './routes/runs';
import { environmentRoutes } from './routes/environments';
import { projectRoutes } from './routes/projects';
import { organizationRoutes } from './routes/organizations-mongo';
import { authRoutes } from './routes/authRoutes';
import { apiTokenRoutes } from './routes/apiTokenRoutes';
import { fileRoutes } from './routes/files';
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

  // Configure CORS
  const corsOptions = {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'http://localhost:3000',
        'http://localhost:3001'
      ];
      
      // In production, also allow Cloudflare Pages domains
      if (process.env.NODE_ENV === 'production' && process.env.ALLOWED_ORIGINS) {
        allowedOrigins.push(...process.env.ALLOWED_ORIGINS.split(','));
      }
      
      if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.pages.dev')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie']
  };

  app.use(cors(corsOptions));
  
  // Handle preflight requests
  app.options('*', cors(corsOptions));
  
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use(cookieParser());

  const testRunner = new TestRunner(io, flowStore, environmentStore, runStore);

  const API_BASE_PATH = process.env.API_BASE_PATH || '/api';

  // Health check endpoints
  app.get('/', (_req, res) => {
    res.json({ 
      message: 'Test Flow Suite API',
      status: 'running',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/health', (_req, res) => {
    res.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

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
  app.use(`${API_BASE_PATH}/files`, auth, fileRoutes());

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