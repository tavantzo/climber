#!/usr/bin/env node

const chalk = require('chalk');
const inquirer = require('inquirer');
const configManager = require('./config');
const { executeHookForProjects, listHooks, STANDARD_HOOKS } = require('./hooks');
const { getTargetProjects } = require('./custom-commands');

/**
 * Parse command-line arguments
 * @returns {Object} - Parsed arguments
 */
function parseArguments() {
  const args = process.argv.slice(2);
  
  const options = {
    hookName: null,
    targets: [],
    parallel: false,
    interactive: false,
    continueOnError: true,
    list: false,
    help: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--parallel' || arg === '-p') {
      options.parallel = true;
    } else if (arg === '--interactive' || arg === '-i') {
      options.interactive = true;
    } else if (arg === '--stop-on-error' || arg === '-s') {
      options.continueOnError = false;
    } else if (arg === '--list' || arg === '-l') {
      options.list = true;
    } else if (!options.hookName && !arg.startsWith('-')) {
      options.hookName = arg;
    } else if (!arg.startsWith('-')) {
      options.targets.push(arg);
    }
  }
  
  return options;
}

/**
 * Show help message
 */
function showHelp() {
  console.log(chalk.blue('Mountain Climber - Command Hooks'));
  console.log('');
  console.log(chalk.cyan('Usage:'));
  console.log('  climb hooks <hook-name> [targets...] [options]');
  console.log('');
  console.log(chalk.cyan('Standard Hooks:'));
  console.log('  install-deps       Install dependencies');
  console.log('  update-deps        Update dependencies');
  console.log('  build              Build project');
  console.log('  test               Run tests');
  console.log('  lint               Run linter');
  console.log('  vcs-status         Check VCS status');
  console.log('  vcs-pull           Pull from VCS');
  console.log('  vcs-sync           Sync with VCS');
  console.log('  db-migrate         Run database migrations');
  console.log('  ...and more (see --list)');
  console.log('');
  console.log(chalk.cyan('Options:'));
  console.log('  --parallel, -p         Execute hooks in parallel');
  console.log('  --interactive, -i      Interactive project and hook selection');
  console.log('  --stop-on-error, -s    Stop execution on first error');
  console.log('  --list, -l             List all available hooks');
  console.log('  --help, -h             Show this help message');
  console.log('');
  console.log(chalk.cyan('Examples:'));
  console.log('  climb hooks install-deps                # Run install-deps hook on all projects');
  console.log('  climb hooks install-deps api frontend   # Run on specific projects');
  console.log('  climb hooks build ruby-projects         # Run on a project group');
  console.log('  climb hooks test --parallel             # Run tests in parallel');
  console.log('  climb hooks --list                      # List all configured hooks');
  console.log('  climb hooks --interactive               # Interactive mode');
  console.log('');
  console.log(chalk.cyan('Configuration:'));
  console.log('  Hooks can be configured in your workspace YAML:');
  console.log('');
  console.log(chalk.gray('  # Global hooks (apply to all projects)'));
  console.log(chalk.gray('  hooks:'));
  console.log(chalk.gray('    install-deps:'));
  console.log(chalk.gray('      command: npm install'));
  console.log(chalk.gray('      description: Install Node.js dependencies'));
  console.log('');
  console.log(chalk.gray('  # Project-specific hooks'));
  console.log(chalk.gray('  projects:'));
  console.log(chalk.gray('    - name: api'));
  console.log(chalk.gray('      path: backend/api'));
  console.log(chalk.gray('      hooks:'));
  console.log(chalk.gray('        install-deps:'));
  console.log(chalk.gray('          command: bundle install'));
  console.log(chalk.gray('          description: Install Ruby gems'));
}

/**
 * Interactive hook execution
 * @param {Object} config - Full configuration
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} - Execution results
 */
async function interactiveHookExecution(config, options = {}) {
  // Get all available hooks
  const globalHooks = config.hooks || {};
  const customCommands = config.customCommands || {};
  const allHooks = { ...globalHooks, ...customCommands };
  
  // Add standard hooks that might be configured in projects
  const projects = config.projects || [];
  projects.forEach(project => {
    if (project.hooks) {
      Object.keys(project.hooks).forEach(hookName => {
        if (!allHooks[hookName]) {
          allHooks[hookName] = { command: 'varies by project' };
        }
      });
    }
  });
  
  if (Object.keys(allHooks).length === 0) {
    console.log(chalk.yellow('No hooks configured.'));
    console.log(chalk.gray('Run "climb hooks --help" to see how to configure hooks.'));
    return { success: true, results: [] };
  }
  
  // Select hook
  const hookChoices = Object.entries(allHooks).map(([name, hook]) => ({
    name: `${name}${hook.description ? ` - ${hook.description}` : ''}`,
    value: name,
    short: name
  }));
  
  const { selectedHook } = await inquirer['prompt']([{
    type: 'list',
    name: 'selectedHook',
    message: 'Select a hook to execute:',
    choices: hookChoices
  }]);
  
  // Select targets
  const allProjects = config.projects || [];
  const groups = config.groups || {};
  
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
  
  const { selectedTarget } = await inquirer['prompt']([{
    type: 'list',
    name: 'selectedTarget',
    message: 'Select target projects:',
    choices: targetChoices
  }]);
  
  // Get target projects
  const targetProjects = getTargetProjects(allProjects, selectedTarget, config);
  
  // Execute the hook
  return await executeHookForProjects(targetProjects, selectedHook, config, options);
}

/**
 * Main execution function
 */
async function main() {
  try {
    const { hookName, targets, ...options } = parseArguments();
    
    // Show help if requested
    if (options.help || (!hookName && !options.list && !options.interactive)) {
      showHelp();
      return;
    }
    
    // Load configuration
    configManager.load();
    const config = configManager.config;
    
    // List hooks if requested
    if (options.list) {
      listHooks(config);
      return;
    }
    
    // Interactive mode
    if (options.interactive || !hookName) {
      await interactiveHookExecution(config, options);
      return;
    }
    
    // Get projects to target
    const allProjects = config.projects || [];
    let targetProjects;
    
    if (targets.length > 0) {
      targetProjects = getTargetProjects(allProjects, targets, config);
      
      if (targetProjects.length === 0) {
        console.error(chalk.red('No matching projects found for targets:'), targets.join(', '));
        process.exit(1);
      }
    } else {
      // Use all projects
      targetProjects = allProjects;
    }
    
    // Execute the hook
    await executeHookForProjects(targetProjects, hookName, config, options);
    
  } catch (error) {
    console.error(chalk.red('Error executing hook:'), error.message);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { main };

