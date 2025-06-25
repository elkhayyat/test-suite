import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { flowRoutes, flowStore } from './routes/flows';
import { runRoutes } from './routes/runs';
import { environmentRoutes } from './routes/environments';
import { projectRoutes } from './routes/projects';
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