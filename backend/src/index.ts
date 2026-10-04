import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { initDatabase } from './config/database';

import authRoutes from './routes/auth.routes';
import teamRoutes from './routes/team.routes';
import deviceRoutes from './routes/device.routes';
import locationRoutes from './routes/location.routes';
import messageRoutes from './routes/message.routes';
import notificationRoutes from './routes/notification.routes';
import offlineRegionRoutes from './routes/offlineRegion.routes';
import syncRoutes from './routes/sync.routes';

import { errorHandler } from './middleware/error.middleware';
import { setupSocketHandlers } from './websocket/socket.handler';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
  }
});

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/offline-regions', offlineRegionRoutes);
app.use('/api/sync', syncRoutes);

// Base route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(errorHandler);

// Websocket setup
setupSocketHandlers(io);

const PORT = process.env.PORT || 5000;

async function startServer() {
  await initDatabase();
  server.listen(PORT, () => {
    console.log(`LoRa Tracker Backend Server running on port ${PORT}`);
  });
}

startServer();

export { app, server };
