import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import axios from 'axios';
import { MongoDB } from './db/mongodb';
import { FlowStore } from './services/FlowStoreMongo';
import { EnvironmentStore } from './services/EnvironmentStoreMongo';
import { ProjectStore } from './services/ProjectStoreMongo';
import { TestRunner } from './services/TestRunner';
import { flowRoutes } from './routes/flows-mongo';
import { runRoutes } from './routes/runs';
import { environmentRoutes } from './routes/environments-mongo';
import { projectRoutes } from './routes/projects-mongo';
import organizationRoutes from './routes/organizations';

async function startServer() {
  // Initialize MongoDB connection
  const mongodb = new MongoDB();
  await mongodb.connect();

  // Initialize stores with MongoDB
  const flowStore = new FlowStore(mongodb);
  const environmentStore = new EnvironmentStore(mongodb);
  const projectStore = new ProjectStore(mongodb);

  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: 'http://localhost:3000',
      methods: ['GET', 'POST']
    }
  });

  app.use(cors());
  app.use(express.json());

  const testRunner = new TestRunner(io, flowStore, environmentStore);

  // Setup routes with stores
  app.use('/api/flows', flowRoutes(flowStore));
  app.use('/api/runs', runRoutes(testRunner));
  app.use('/api/environments', environmentRoutes(environmentStore));
  app.use('/api/projects', projectRoutes(projectStore, flowStore));
  app.use('/api/organizations', organizationRoutes);

  // Proxy endpoint for external API requests (CORS workaround)
  app.get('/api/proxy', async (req, res) => {
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