const express = require('express');
const router = express.Router();
const dc = require('docker-compose');
const path = require('path');
const { configManager } = require('@climber/core');

/**
 * GET /api/logs/:project
 * Get logs for a specific project
 */
router.get('/:project', async (req, res) => {
  try {
    configManager.load();
    const config = configManager.config;
    const projectName = req.params.project;
    const { tail = 100, service } = req.query;
    
    const project = config.projects.find(p => p.name === projectName);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const projectPath = path.join(config.root, project.path);
    
    const options = {
      cwd: projectPath,
      commandOptions: ['--tail', tail.toString()]
    };
    
    if (service) {
      options.commandOptions.push(service);
    }
    
    const logs = await dc.logs([], options);
    
    res.json({
      project: projectName,
      logs: logs.out
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

