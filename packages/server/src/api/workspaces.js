const express = require('express');
const router = express.Router();
const { configManager } = require('@climber/core');

/**
 * GET /api/workspaces
 * List all workspaces
 */
router.get('/', (req, res) => {
  try {
    const workspaces = configManager.listWorkspaces();
    const current = configManager.getCurrentWorkspace();
    
    res.json({
      current,
      workspaces
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/workspaces/current
 * Get current workspace with full configuration
 */
router.get('/current', (req, res) => {
  try {
    configManager.load();
    const config = configManager.config;
    const current = configManager.getCurrentWorkspace();
    
    res.json({
      name: current,
      config
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/workspaces/switch
 * Switch to a different workspace
 */
router.post('/switch', (req, res) => {
  try {
    const { workspace } = req.body;
    
    if (!workspace) {
      return res.status(400).json({ error: 'workspace name is required' });
    }
    
    configManager.switchWorkspace(workspace);
    
    res.json({ 
      success: true,
      workspace
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

