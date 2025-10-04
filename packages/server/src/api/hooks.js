const express = require('express');
const router = express.Router();
const { configManager, executeHookForProjects, listHooks, STANDARD_HOOKS } = require('@climber/core');

/**
 * GET /api/hooks
 * List all available hooks
 */
router.get('/', (req, res) => {
  try {
    configManager.load();
    const config = configManager.config;
    
    const hooks = {
      standard: STANDARD_HOOKS,
      global: config.hooks || {},
      customCommands: config.customCommands || {},
      projects: config.projects
        .filter(p => p.hooks && Object.keys(p.hooks).length > 0)
        .map(p => ({
          name: p.name,
          hooks: p.hooks
        }))
    };
    
    res.json(hooks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/hooks/execute
 * Execute a hook on specified projects
 */
router.post('/execute', async (req, res) => {
  try {
    const { hookName, projects, options = {} } = req.body;
    
    if (!hookName) {
      return res.status(400).json({ error: 'hookName is required' });
    }
    
    configManager.load();
    const config = configManager.config;
    
    const targetProjects = projects 
      ? config.projects.filter(p => projects.includes(p.name))
      : config.projects;
    
    const result = await executeHookForProjects(targetProjects, hookName, config, options);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

