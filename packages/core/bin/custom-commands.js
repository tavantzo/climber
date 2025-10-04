const { spawn } = require('child_process');
const chalk = require('chalk');
const path = require('path');
const inquirer = require('inquirer');

/**
 * Execute a custom command for a specific project
 * @param {Object} project - Project configuration
 * @param {string} projectPath - Full path to project directory
 * @param {Object} command - Command configuration
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} - Command execution result
 */
async function executeCustomCommand(project, projectPath, command, options = {}) {
  const { interactive = false } = options;

  console.log(chalk.blue(`🔧 Running "${command.name}" in ${project.name}...`));

  if (command.description) {
    console.log(chalk.gray(`   ${command.description}`));
  }

  // Support environment variable substitution in commands
  let commandString = command.command;
  commandString = commandString.replace(/\$\{PROJECT_NAME\}/g, project.name);
  commandString = commandString.replace(/\$\{PROJECT_PATH\}/g, project.path);
  
  const commandArgs = commandString.split(' ');
  const [cmd, ...args] = commandArgs;

  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: projectPath,
      stdio: interactive ? 'inherit' : ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...command.env }
    });

    let stdout = '';
    let stderr = '';

    if (!interactive) {
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }

    child.on('close', (code) => {
      if (code === 0) {
        console.log(chalk.green(`✓ "${command.name}" completed successfully in ${project.name}`));
        resolve({
          success: true,
          project: project.name,
          command: command.name,
          output: stdout,
          error: stderr
        });
      } else {
        console.error(chalk.red(`✗ "${command.name}" failed in ${project.name} (exit code: ${code})`));
        if (stderr) {
          console.error(chalk.red(stderr));
        }
        reject(new Error(`Command "${command.name}" failed in ${project.name} with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      console.error(chalk.red(`✗ Error running "${command.name}" in ${project.name}:`), error.message);
      reject(error);
    });
  });
}

/**
 * Get projects that match the target criteria
 * @param {Array} allProjects - All available projects
 * @param {string|Array} target - Target projects (project names, group names, or 'all')
 * @param {Object} config - Full configuration with groups
 * @returns {Array} - Matching projects
 */
function getTargetProjects(allProjects, target, config) {
  if (target === 'all' || (Array.isArray(target) && target.includes('all'))) {
    return allProjects;
  }

  // Handle null/undefined target
  if (!target) {
    return allProjects;
  }

  const targets = Array.isArray(target) ? target : [target];
  const matchingProjects = [];

  for (const targetName of targets) {
    // Check if it's a project name
    const project = allProjects.find(p => p.name === targetName);
    if (project) {
      matchingProjects.push(project);
      continue;
    }

    // Check if it's a group name
    if (config.groups && config.groups[targetName]) {
      const groupProjects = config.groups[targetName].map(projectName =>
        allProjects.find(p => p.name === projectName)
      ).filter(Boolean);
      matchingProjects.push(...groupProjects);
    }
  }

  return matchingProjects;
}

/**
 * Execute custom commands for multiple projects
 * @param {string|Array} target - Target projects or groups
 * @param {string} commandName - Name of the command to execute
 * @param {Object} config - Full configuration
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} - Execution results
 */
async function executeCustomCommands(target, commandName, config, options = {}) {
  const { parallel = false } = options;

  // Get all available projects
  const allProjects = config.projects || [];

  // Find the command configuration
  const command = config.customCommands?.[commandName];
  if (!command) {
    throw new Error(`Custom command "${commandName}" not found`);
  }

  // Get target projects
  const targetProjects = getTargetProjects(allProjects, target, config);

  if (targetProjects.length === 0) {
    console.log(chalk.yellow(`No projects found for target: ${Array.isArray(target) ? target.join(', ') : target}`));
    return { success: true, results: [] };
  }

  console.log(chalk.blue(`🚀 Running "${commandName}" on ${targetProjects.length} project(s)...`));
  console.log(chalk.cyan(`📋 Target projects: ${targetProjects.map(p => p.name).join(', ')}\n`));

  const results = [];

  if (parallel) {
    // Execute commands in parallel
    const promises = targetProjects.map(async (project) => {
      const projectPath = path.join(config.root, project.path);
      try {
        return await executeCustomCommand(project, projectPath, command, options);
      } catch (error) {
        return {
          success: false,
          project: project.name,
          command: commandName,
          error: error.message
        };
      }
    });

    const parallelResults = await Promise.all(promises);
    results.push(...parallelResults);
  } else {
    // Execute commands sequentially
    for (const project of targetProjects) {
      const projectPath = path.join(config.root, project.path);
      try {
        const result = await executeCustomCommand(project, projectPath, command, options);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          project: project.name,
          command: commandName,
          error: error.message
        });

        if (!options.continueOnError) {
          throw error;
        }
      }
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.length - successCount;

  console.log(chalk.blue(`\n📊 Execution Summary:`));
  console.log(chalk.green(`✓ Successful: ${successCount}`));
  if (failureCount > 0) {
    console.log(chalk.red(`✗ Failed: ${failureCount}`));
  }

  return {
    success: failureCount === 0,
    command: commandName,
    target: target,
    results
  };
}

/**
 * List available custom commands
 * @param {Object} config - Full configuration
 * @returns {void}
 */
function listCustomCommands(config) {
  const customCommands = config.customCommands || {};
  const groups = config.groups || {};

  if (Object.keys(customCommands).length === 0) {
    console.log(chalk.yellow('No custom commands configured.'));
    return;
  }

  console.log(chalk.blue('📋 Available Custom Commands:'));
  console.log('');

  Object.entries(customCommands).forEach(([name, command]) => {
    console.log(chalk.cyan(`  ${name}`));
    if (command.description) {
      console.log(chalk.gray(`    ${command.description}`));
    }
    console.log(chalk.gray(`    Command: ${command.command}`));
    if (command.target) {
      console.log(chalk.gray(`    Default Target: ${Array.isArray(command.target) ? command.target.join(', ') : command.target}`));
    }
    console.log('');
  });

  if (Object.keys(groups).length > 0) {
    console.log(chalk.blue('📁 Available Project Groups:'));
    console.log('');
    Object.entries(groups).forEach(([name, projects]) => {
      console.log(chalk.cyan(`  ${name}: ${projects.join(', ')}`));
    });
    console.log('');
  }
}

/**
 * Interactive command selection and execution
 * @param {Object} config - Full configuration
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} - Execution results
 */
async function interactiveCommandExecution(config, options = {}) {
  const customCommands = config.customCommands || {};
  const commandNames = Object.keys(customCommands);

  if (commandNames.length === 0) {
    console.log(chalk.yellow('No custom commands configured.'));
    return { success: true, results: [] };
  }

  // Select command
  const { selectedCommand } = await inquirer['prompt']([{
    type: 'list',
    name: 'selectedCommand',
    message: 'Select a custom command to run:',
    choices: commandNames.map(name => ({
      name: `${name}${customCommands[name].description ? ` - ${customCommands[name].description}` : ''}`,
      value: name,
      short: name
    }))
  }]);

  const allProjects = config.projects || [];
  const groups = config.groups || {};

  // Build target choices
  const targetChoices = [
    { name: 'All projects', value: 'all', short: 'all' }
  ];

  // Add individual projects
  allProjects.forEach(project => {
    targetChoices.push({
      name: `Project: ${project.name}${project.description ? ` - ${project.description}` : ''}`,
      value: project.name,
      short: project.name
    });
  });

  // Add groups
  Object.entries(groups).forEach(([groupName, projects]) => {
    targetChoices.push({
      name: `Group: ${groupName} (${projects.join(', ')})`,
      value: groupName,
      short: groupName
    });
  });

  // Select target
  const { selectedTarget } = await inquirer['prompt']([{
    type: 'list',
    name: 'selectedTarget',
    message: 'Select target projects:',
    choices: targetChoices
  }]);

  // Execute the command
  return await executeCustomCommands(selectedTarget, selectedCommand, config, options);
}

module.exports = {
  executeCustomCommand,
  executeCustomCommands,
  getTargetProjects,
  listCustomCommands,
  interactiveCommandExecution
};
