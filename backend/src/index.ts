import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import axios from 'axios';
import { flowRoutes, flowStore } from './routes/flows';
import { runRoutes } from './routes/runs';
import { environmentRoutes } from './routes/environments';
import { projectRoutes } from './routes/projects';
import organizationRoutes from './routes/organizations';
import { TestRunner } from './services/TestRunner';
import { EnvironmentStore } from './services/EnvironmentStore';

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
app.use(express.json());

const environmentStore = new EnvironmentStore();
const testRunner = new TestRunner(io, flowStore, environmentStore);

// Health check endpoints
app.get('/', (req, res) => {
  res.json({ 
    message: 'Test Flow Suite API',
    status: 'running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

const API_BASE_PATH = process.env.API_BASE_PATH || '/api';

app.use(`${API_BASE_PATH}/flows`, flowRoutes);
app.use(`${API_BASE_PATH}/runs`, runRoutes(testRunner));
app.use(`${API_BASE_PATH}/environments`, environmentRoutes);
app.use(`${API_BASE_PATH}/projects`, projectRoutes);
app.use(`${API_BASE_PATH}/organizations`, organizationRoutes);

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
  console.log(`Server running on port ${PORT}`);
});