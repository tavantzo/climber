const express = require('express');
const router = express.Router();
const { configManager, folders } = require('@climber/core');
const dc = require('docker-compose');
const path = require('path');

/**
 * GET /api/projects
 * Get all projects with their current status
 */
router.get('/', async (req, res) => {
  try {
    configManager.load();
    const config = configManager.config;
    const environment = process.env.CLIMBER_ENV || 'default';
    
    const projects = folders.getProjects(environment);
    
    // Get status for each project
    const projectsWithStatus = await Promise.all(
      projects.map(async (project) => {
        try {
          const projectPath = path.join(config.root, project.path);
          const status = await dc.ps({ cwd: projectPath });
          
          return {
            ...project,
            status: 'running',
            containers: status.data?.services || [],
            raw: status.out
          };
        } catch (error) {
          return {
            ...project,
            status: 'stopped',
            containers: [],
            error: error.message
          };
        }
      })
    );
    
    res.json({
      environment,
      workspace: configManager.currentWorkspace,
      projects: projectsWithStatus
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/projects/bulk/start
 * Start multiple projects
 */
router.post('/bulk/start', async (req, res) => {
  try {
    const { projects: projectNames } = req.body;
    
    if (!Array.isArray(projectNames)) {
      return res.status(400).json({ error: 'projects must be an array' });
    }
    
    configManager.load();
    const config = configManager.config;
    
    const results = [];
    
    for (const projectName of projectNames) {
      const project = config.projects.find(p => p.name === projectName);
      if (!project) {
        results.push({ project: projectName, success: false, error: 'Not found' });
        continue;
      }
      
      try {
        const projectPath = path.join(config.root, project.path);
        await dc.upAll({
          cwd: projectPath,
          log: true,
          commandOptions: ['--build', '--remove-orphans']
        });
        results.push({ project: projectName, success: true });
      } catch (error) {
        results.push({ project: projectName, success: false, error: error.message });
      }
    }
    
    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/projects/bulk/stop
 * Stop multiple projects
 */
router.post('/bulk/stop', async (req, res) => {
  try {
    const { projects: projectNames } = req.body;
    
    if (!Array.isArray(projectNames)) {
      return res.status(400).json({ error: 'projects must be an array' });
    }
    
    configManager.load();
    const config = configManager.config;
    
    const results = [];
    
    for (const projectName of projectNames) {
      const project = config.projects.find(p => p.name === projectName);
      if (!project) {
        results.push({ project: projectName, success: false, error: 'Not found' });
        continue;
      }
      
      try {
        const projectPath = path.join(config.root, project.path);
        await dc.down({ cwd: projectPath, log: true });
        results.push({ project: projectName, success: true });
      } catch (error) {
        results.push({ project: projectName, success: false, error: error.message });
      }
    }
    
    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/projects/:name
 * Get a specific project with detailed status
 */
router.get('/:name', async (req, res) => {
  try {
    configManager.load();
    const config = configManager.config;
    const projectName = req.params.name;
    
    const project = config.projects.find(p => p.name === projectName);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const projectPath = path.join(config.root, project.path);
    const status = await dc.ps({ cwd: projectPath });
    
    res.json({
      ...project,
      status: status.data?.services?.length > 0 ? 'running' : 'stopped',
      containers: status.data?.services || [],
      raw: status.out
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/projects/:name/start
 * Start a project
 */
router.post('/:name/start', async (req, res) => {
  try {
    configManager.load();
    const config = configManager.config;
    const projectName = req.params.name;
    
    const project = config.projects.find(p => p.name === projectName);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const projectPath = path.join(config.root, project.path);
    
    // Start the project
    await dc.upAll({
      cwd: projectPath,
      log: true,
      commandOptions: ['--build', '--remove-orphans']
    });
    
    res.json({ 
      success: true, 
      message: `Project ${projectName} started successfully` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/projects/:name/stop
 * Stop a project
 */
router.post('/:name/stop', async (req, res) => {
  try {
    configManager.load();
    const config = configManager.config;
    const projectName = req.params.name;
    
    const project = config.projects.find(p => p.name === projectName);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const projectPath = path.join(config.root, project.path);
    
    // Stop the project
    await dc.down({
      cwd: projectPath,
      log: true
    });
    
    res.json({ 
      success: true, 
      message: `Project ${projectName} stopped successfully` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/projects/:name/restart
 * Restart a project
 */
router.post('/:name/restart', async (req, res) => {
  try {
    configManager.load();
    const config = configManager.config;
    const projectName = req.params.name;
    
    const project = config.projects.find(p => p.name === projectName);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const projectPath = path.join(config.root, project.path);
    
    // Restart the project
    await dc.restartAll({
      cwd: projectPath,
      log: true
    });
    
    res.json({ 
      success: true, 
      message: `Project ${projectName} restarted successfully` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

