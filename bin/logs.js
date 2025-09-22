#!/usr/bin/env node
const { spawn } = require('child_process');
const chalk = require('chalk');
const path = require('path');
const inquirer = require('inquirer');
const configManager = require('./config');

/**
 * Select projects to get logs from
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
    message: 'Select projects to get logs from:',
    choices: choices,
    default: availableProjects.map(p => p.name) // Select all by default
  }]);

  return availableProjects.filter(project =>
    selectedProjectNames.includes(project.name)
  );
}

/**
 * Get logs for a single project
 * @param {Object} project - Project configuration
 * @param {string} projectPath - Full path to project directory
 * @param {number} index - Current project index
 * @param {number} total - Total number of projects
 * @param {Object} options - Log options (tail, service, follow)
 * @returns {Promise<Object>} - Log result
 */
async function getLogsForProject(project, projectPath, index, total, options) {
  const dirName = project.name;
  const { tail, service, follow } = options;

  console.log(chalk.yellow(`\n[${index + 1}/${total}] === ${dirName} Services ===`));

  if (project.description) {
    console.log(chalk.gray(`   ${project.description}`));
  }

  const commandArgs = ['compose', 'logs', '--tail', tail];

  if (service) {
    commandArgs.push(String(service));
  }

  if (follow) {
    commandArgs.push('--follow');
  }

  console.log(chalk.gray(`   Running: docker ${commandArgs.join(' ')} in ${projectPath}`));

  if (follow) {
    // For follow mode, return the child process
    const child = spawn('docker', commandArgs, {
      cwd: projectPath,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Add project name prefix to each log line
    child.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          console.log(chalk.cyan(`[${dirName}]`) + ' ' + line);
        }
      });
    });

    child.stderr.on('data', (data) => {
      const lines = data.toString().split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          console.log(chalk.red(`[${dirName}]`) + ' ' + line);
        }
      });
    });

    child.on('error', (error) => {
      console.error(chalk.red(`Error following logs for ${dirName}:`), error.message);
    });

    return { success: true, project: dirName, process: child };
  } else {
    // Normal mode - get logs and return
    const result = await new Promise((resolve, reject) => {
      const child = spawn('docker', commandArgs, {
        cwd: projectPath,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ out: stdout, err: stderr });
        } else {
          reject(new Error(`Docker compose logs failed with exit code ${code}: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });

    console.log(result.out);
    return { success: true, project: dirName, logs: result.out };
  }
}

/**
 * Get logs for all services in a given environment
 * @param {string} environment - Environment name
 * @param {Array} selectedProjects - Specific projects to get logs from (optional)
 * @param {Object} options - Log options (tail, service, follow)
 * @returns {Promise<Object>} - Results of getting logs
 */
async function getLogs(environment = 'default', selectedProjects = [], options = {}) {
  const allProjects = configManager.getStartupOrder(environment);
  const projects = await selectProjects(allProjects, selectedProjects);
  const results = [];

  if (projects.length === 0) {
    console.log(chalk.yellow('No projects selected.'));
    return { success: true, environment, results: [] };
  }

  console.log(chalk.blue(`📋 Fetching logs from ${environment} environment...\n`));

  if (options.follow) {
    console.log(chalk.blue('Following logs from selected services... Press Ctrl+C to stop.\n'));
    const processes = [];

    for (let i = 0; i < projects.length; i += 1) {
      const project = projects[i];
      const folder = path.join(configManager.config.root, project.path);

      const result = await getLogsForProject(project, folder, i, projects.length, options);
      if (result.process) {
        processes.push(result.process);
      }
      results.push(result);
    }

    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\nStopping log following...'));
      processes.forEach(child => {
        child.kill('SIGTERM');
      });
      process.exit(0);
    });

    // Wait for all processes to complete (they won't in follow mode, but this keeps the script running)
    await Promise.all(processes.map(child => new Promise((resolve) => {
      child.on('close', resolve);
    })));

  } else {
    // Normal mode - process projects sequentially
    for (let i = 0; i < projects.length; i += 1) {
      const project = projects[i];
      const folder = path.join(configManager.config.root, project.path);

      try {
        const result = await getLogsForProject(project, folder, i, projects.length, options);
        results.push(result);
      } catch (error) {
        console.error(chalk.red(`✗ Failed to get logs for ${project.name}:`), error.message);
        throw error;
      }
    }
  }

  return { success: true, environment, results };
}

// Only run if this file is executed directly, not when imported
if (require.main === module) {
  (async function() {
    try {
      const args = process.argv.slice(2);
      const follow = args.includes('--follow') || args.includes('-f');
      const tail = args.find(arg => arg.startsWith('--tail='))?.split('=')[1] || '100';
      const service = args.find(arg => !arg.startsWith('--') && !arg.startsWith('-')) || null;

      const environment = process.env.CLIMBER_ENV || 'default';

      // Parse command line arguments for project selection
      const selectedProjects = args.filter(arg => !arg.startsWith('--') && !arg.startsWith('-') && arg !== service);

      const options = { tail, service, follow };

      await getLogs(environment, selectedProjects, options);
    } catch (error) {
      console.error(chalk.red('Error fetching logs:'), error.message);
      process.exit(1);
    }
  })();
}

// Export functions for testing
module.exports = {
  getLogsForProject,
  getLogs,
  selectProjects
};
