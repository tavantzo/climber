const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const bodyParser = require('body-parser');
require('dotenv').config();

// Import routes
const projectsRouter = require('./api/projects');
const hooksRouter = require('./api/hooks');
const gitRouter = require('./api/git');
const workspacesRouter = require('./api/workspaces');
const logsRouter = require('./api/logs');

// Import WebSocket handlers
const setupWebSocket = require('./websocket');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow for development
}));
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from web build
const webDistPath = path.join(__dirname, '../../web/dist');
app.use(express.static(webDistPath));

// API Routes
app.use('/api/projects', projectsRouter);
app.use('/api/hooks', hooksRouter);
app.use('/api/git', gitRouter);
app.use('/api/workspaces', workspacesRouter);
app.use('/api/logs', logsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Serve React app for all other routes (SPA fallback)
app.get('*', (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) {
    return next();
  }
  
  const indexPath = path.join(webDistPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).json({ error: 'Dashboard not found. Run: yarn workspace @climber/web build' });
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Setup WebSocket
setupWebSocket(io);

// Start server
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';
const OPEN_BROWSER = process.env.OPEN_BROWSER === 'true';

server.listen(PORT, HOST, () => {
  const url = `http://${HOST}:${PORT}`;
  
  console.log('');
  console.log(`🚀 Mountain Climber Server`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📍 Server:     ${url}`);
  console.log(`📡 WebSocket:  Ready`);
  console.log(`🌍 CORS:       ${process.env.CORS_ORIGIN || 'http://localhost:3001'}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log('');
  console.log(`✅ Ready! Open ${url} in your browser`);
  console.log('');
  console.log(`Press Ctrl+C to stop the server`);
  console.log('');
  
  // Auto-open browser if requested
  if (OPEN_BROWSER) {
    const open = require('open');
    open(url).catch(err => {
      console.log('Could not auto-open browser:', err.message);
    });
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server, io };

