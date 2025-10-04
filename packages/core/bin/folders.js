const configManager = require('./config');

// Load configuration and get project paths
const environment = process.env.CLIMBER_ENV || 'default';
const folders = configManager.getProjectPaths(environment);

module.exports = folders;