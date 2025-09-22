#!/usr/bin/env node
const dc = require('docker-compose');
const chalk = require('chalk');
const path = require('path');
const inquirer = require('inquirer');
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
 * Select projects to start
 * @param {Array} availableProjects - Available projects
 * @param {Array} selectedProjects - Pre-selected projects (if any)
 * @returns {Promise<Array>} - Selected projects
 */
async function selectProjects(availableProjects, selectedProjects = []) {
  if (selectedProjects.length > 0) {
    // Filter available projects by selected names
    const filteredProjects = availableProjects.filter(project =>
      selectedProjects.includes(project.name)
    );

    if (filteredProjects.length === 0) {
      console.error(chalk.red('No matching projects found for selection:'), selectedProjects.join(', '));
      process.exit(1);
    }

    return filteredProjects;
  }

  // Interactive selection
  const choices = availableProjects.map(project => ({
    name: `${project.name}${project.description ? ` - ${project.description}` : ''}`,
    value: project.name,
    short: project.name
  }));

  const { selectedProjectNames } = await inquirer.prompt([{
    type: 'checkbox',
    name: 'selectedProjectNames',
    message: 'Select projects to start:',
    choices: choices,
    default: availableProjects.map(p => p.name) // Select all by default
  }]);

  return availableProjects.filter(project =>
    selectedProjectNames.includes(project.name)
  );
}

/**
 * Start all services for a given environment
 * @param {string} environment - Environment name
 * @param {Array} selectedProjects - Specific projects to start (optional)
 * @returns {Promise<Object>} - Results of starting all services
 */
async function startServices(environment = 'default', selectedProjects = []) {
  const allProjects = configManager.getStartupOrder(environment);
  const projects = await selectProjects(allProjects, selectedProjects);
  const results = [];

  if (projects.length === 0) {
    console.log(chalk.yellow('No projects selected.'));
    return { success: true, environment, results: [] };
  }

  console.log(chalk.blue(`🚀 Starting services in ${environment} environment...`));
  console.log(chalk.cyan(`📋 Selected projects: ${projects.map(p => p.name).join(' → ')}\n`));

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

  console.log(chalk.green(`\n🎉 All selected services started successfully in ${environment} environment!`));
  return { success: true, environment, results };
}

// Only run if this file is executed directly, not when imported
if (require.main === module) {
  (async function() {
    try {
      const environment = process.env.CLIMBER_ENV || 'default';

      // Parse command line arguments for project selection
      const args = process.argv.slice(2);
      const selectedProjects = args.filter(arg => !arg.startsWith('--'));

      await startServices(environment, selectedProjects);
    } catch (error) {
      console.error(chalk.red('Error starting services:'), error.message);
      process.exit(1);
    }
  })();
}

// Export functions for testing
module.exports = {
  startProject,
  startServices,
  selectProjects
};