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

const testRunner = new TestRunner(io, flowStore);

app.use('/api/flows', flowRoutes);
app.use('/api/runs', runRoutes(testRunner));
app.use('/api/environments', environmentRoutes);
app.use('/api/projects', projectRoutes);
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
  console.log(`Server running on port ${PORT}`);
});