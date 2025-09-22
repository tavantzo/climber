#!/usr/bin/env node
const dc = require('docker-compose');
const chalk = require('chalk');
const path = require('path');
const configManager = require('./config');

/**
 * Start a single project's services
 * @param {Object} project - Project configuration
 * @param {string} projectPath - Full path to project directory
 * @param {number} index - Current project index
 * @param {number} total - Total number of projects
 * @returns {Promise<Object>} - Status information
 */
async function startProject(project, projectPath, index, total) {
  const dirName = project.name;

  console.log(chalk.blue(`[${index + 1}/${total}] Starting ${dirName}...`));

  if (project.description) {
    console.log(chalk.gray(`   ${project.description}`));
  }

  await dc.upAll({
    log: false,
    cwd: projectPath,
    commandOptions: ['--build', '--remove-orphans', '--force-recreate']
  });

  const status = await dc.ps({ cwd: projectPath });
  console.log(chalk.green(`✓ ${dirName} started successfully`));
  console.log(status.out);

  // Add a small delay between projects to ensure proper startup
  if (index < total - 1) {
    console.log(chalk.gray('   Waiting 2 seconds before starting next project...\n'));
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return { success: true, project: dirName, status: status.out };
}

/**
 * Start all services for a given environment
 * @param {string} environment - Environment name
 * @returns {Promise<Object>} - Results of starting all services
 */
async function startServices(environment = 'default') {
  const projects = configManager.getStartupOrder(environment);
  const results = [];

  console.log(chalk.blue(`🚀 Starting services in ${environment} environment...`));
  console.log(chalk.cyan(`📋 Startup order: ${projects.map(p => p.name).join(' → ')}\n`));

  for (let i = 0; i < projects.length; i += 1) {
    const project = projects[i];
    const folder = path.join(configManager.config.root, project.path);

    try {
      const result = await startProject(project, folder, i, projects.length);
      results.push(result);
    } catch (error) {
      console.error(chalk.red(`✗ Failed to start services in ${project.name}:`), error.message);
      throw error;
    }
  }

  console.log(chalk.green(`\n🎉 All services started successfully in ${environment} environment!`));
  return { success: true, environment, results };
}

// Only run if this file is executed directly, not when imported
if (require.main === module) {
  (async function() {
    try {
      const environment = process.env.CLIMBER_ENV || 'default';
      await startServices(environment);
    } catch (error) {
      console.error(chalk.red('Error starting services:'), error.message);
      process.exit(1);
    }
  })();
}

// Export functions for testing
module.exports = {
  startProject,
  startServices
};