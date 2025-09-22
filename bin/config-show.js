#!/usr/bin/env node
const chalk = require('chalk');
const configManager = require('./config');

(async function() {
  try {
    const environment = process.env.CLIMBER_ENV || 'default';

    console.log(chalk.blue('🔧 Mountain Climber Configuration\n'));

    // Load configuration
    configManager.load();

    // Show current workspace and environment
    const currentWorkspace = configManager.getCurrentWorkspace();
    console.log(chalk.yellow('Current Workspace:'), chalk.cyan(currentWorkspace));
    console.log(chalk.yellow('Current Environment:'), chalk.cyan(environment));
    console.log(chalk.yellow('Configuration File:'), chalk.gray(configManager.getCurrentWorkspaceConfig()));
    console.log('');

    // Show root directory
    console.log(chalk.yellow('Root Directory:'), chalk.cyan(configManager.config.root));
    console.log('');

    // Show available environments
    console.log(chalk.yellow('Available Environments:'));
    Object.entries(configManager.config.environments || {}).forEach(([envName, envConfig]) => {
      const isCurrent = envName === environment;
      const marker = isCurrent ? '👉' : '  ';
      const nameColor = isCurrent ? chalk.green : chalk.white;
      console.log(`  ${marker} ${nameColor(envName)} - ${chalk.gray(envConfig.description || 'No description')}`);
    });
    console.log('');

    // Show current environment projects
    const currentProjects = configManager.getProjectsForEnvironment(environment);
    console.log(chalk.yellow(`Projects in ${environment} environment:`));
    currentProjects.forEach((project, index) => {
      console.log(`  ${index + 1}. ${chalk.cyan(project.name)} - ${chalk.gray(project.description || 'No description')}`);
    });
    console.log('');

    // Show startup order
    const startupOrder = configManager.getStartupOrder(environment);
    console.log(chalk.yellow('Startup Order:'));
    startupOrder.forEach((project, index) => {
      console.log(`  ${index + 1}. ${chalk.green(project.name)}`);
    });
    console.log('');

    // Show dependencies
    if (configManager.config.dependencies && Object.keys(configManager.config.dependencies).length > 0) {
      console.log(chalk.yellow('Service Dependencies:'));
      Object.entries(configManager.config.dependencies).forEach(([project, deps]) => {
        if (currentProjects.some(p => p.name === project)) {
          console.log(`  ${chalk.cyan(project)} depends on: ${deps.map(dep => chalk.gray(dep)).join(', ')}`);
        }
      });
      console.log('');
    }

    // Show usage examples
    console.log(chalk.yellow('Usage Examples:'));
    console.log(`  ${chalk.gray('# Start current environment')}`);
    console.log(`  ${chalk.green('climb up')}`);
    console.log('');
    console.log(`  ${chalk.gray('# Switch to different environment')}`);
    console.log(`  ${chalk.green('CLIMBER_ENV=development climb up')}`);
    console.log('');
    console.log(`  ${chalk.gray('# Show status of current environment')}`);
    console.log(`  ${chalk.green('climb ps')}`);

  } catch (error) {
    console.error(chalk.red('Error showing configuration:'), error.message);
    process.exit(1);
  }
})();
