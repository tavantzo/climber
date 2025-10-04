const express = require('express');
const router = express.Router();
const path = require('path');
const { configManager, executeGitOperation } = require('@climber/core');

/**
 * GET /api/git/status
 * Get git status for all or specified projects
 */
router.get('/status', async (req, res) => {
  try {
    const { projects: projectNames } = req.query;
    
    configManager.load();
    const config = configManager.config;
    
    const projects = projectNames 
      ? config.projects.filter(p => projectNames.split(',').includes(p.name))
      : config.projects;
    
    const result = await executeGitOperation(projects, 'status', config);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/git/pull
 * Pull changes for specified projects
 */
router.post('/pull', async (req, res) => {
  try {
    const { projects: projectNames, options = {} } = req.body;
    
    configManager.load();
    const config = configManager.config;
    
    const projects = projectNames 
      ? config.projects.filter(p => projectNames.includes(p.name))
      : config.projects;
    
    const result = await executeGitOperation(projects, 'pull', config, options);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/git/sync
 * Sync projects with remote
 */
router.post('/sync', async (req, res) => {
  try {
    const { projects: projectNames, options = {} } = req.body;
    
    configManager.load();
    const config = configManager.config;
    
    const projects = projectNames 
      ? config.projects.filter(p => projectNames.includes(p.name))
      : config.projects;
    
    const result = await executeGitOperation(projects, 'sync', config, options);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

