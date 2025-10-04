const { configManager, folders } = require('@climber/core');
const dc = require('docker-compose');
const path = require('path');

/**
 * Setup WebSocket server for real-time updates
 */
function setupWebSocket(io) {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    
    // Send initial data
    socket.emit('connected', { 
      message: 'Connected to Mountain Climber server',
      timestamp: new Date().toISOString()
    });
    
    // Subscribe to project status updates
    socket.on('subscribe:projects', async () => {
      try {
        configManager.load();
        const config = configManager.config;
        const environment = process.env.CLIMBER_ENV || 'default';
        const projects = folders.getProjects(environment);
        
        // Send initial status
        const projectsWithStatus = await getProjectsStatus(projects, config);
        socket.emit('projects:status', projectsWithStatus);
        
        // Set up polling for updates (every 5 seconds)
        const interval = setInterval(async () => {
          try {
            const updatedStatus = await getProjectsStatus(projects, config);
            socket.emit('projects:status', updatedStatus);
          } catch (error) {
            console.error('Error polling project status:', error);
          }
        }, 5000);
        
        // Clean up on disconnect
        socket.on('disconnect', () => {
          clearInterval(interval);
        });
        
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });
    
    // Subscribe to logs for a specific project
    socket.on('subscribe:logs', async ({ project: projectName, service }) => {
      try {
        configManager.load();
        const config = configManager.config;
        
        const project = config.projects.find(p => p.name === projectName);
        if (!project) {
          socket.emit('error', { message: 'Project not found' });
          return;
        }
        
        const projectPath = path.join(config.root, project.path);
        
        // Stream logs
        const options = {
          cwd: projectPath,
          commandOptions: ['--follow', '--tail', '100']
        };
        
        if (service) {
          options.commandOptions.push(service);
        }
        
        // Note: docker-compose library doesn't support streaming well
        // This is a simplified version - in production, you'd want to use spawn
        const logs = await dc.logs([], options);
        socket.emit('logs:data', { project: projectName, logs: logs.out });
        
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}

/**
 * Get status for all projects
 */
async function getProjectsStatus(projects, config) {
  return Promise.all(
    projects.map(async (project) => {
      try {
        const projectPath = path.join(config.root, project.path);
        const status = await dc.ps({ cwd: projectPath });
        
        const services = status.data?.services || [];
        const isRunning = services.length > 0 && services.some(s => 
          s.state === 'running' || s.status?.includes('Up')
        );
        
        return {
          ...project,
          status: isRunning ? 'running' : 'stopped',
          containers: services,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        return {
          ...project,
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    })
  );
}

module.exports = setupWebSocket;

