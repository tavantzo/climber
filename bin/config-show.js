#!/usr/bin/env node
const chalk = require('chalk');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const configManager = require('./config');

// Only run if this file is executed directly, not when imported
if (require.main === module) {
  (async function() {
  try {
    const args = process.argv.slice(2);
    const showRaw = args.includes('--raw') || args.includes('-r');
    const showExport = args.includes('--export') || args.includes('-e');
    const showHelp = args.includes('--help') || args.includes('-h');

    if (showHelp) {
      showConfigHelp();
      return;
    }

    if (showExport) {
      exportConfiguration();
      return;
    }

    if (showRaw) {
      showRawConfiguration();
      return;
    }

    showDetailedConfiguration();

  } catch (error) {
    console.error(chalk.red('Error showing configuration:'), error.message);
    process.exit(1);
  }
  })();
}

function showConfigHelp() {
  console.log(chalk.blue('🔧 Mountain Climber Configuration Help\n'));
  console.log(chalk.cyan('Usage:'));
  console.log('  climb config                    # Show detailed configuration');
  console.log('  climb config --raw              # Show raw YAML configuration');
  console.log('  climb config --export           # Export configuration to stdout');
  console.log('  climb config --help             # Show this help\n');
  
  console.log(chalk.cyan('Options:'));
  console.log('  --raw, -r      Show raw YAML configuration');
  console.log('  --export, -e   Export configuration for backup/import');
  console.log('  --help, -h     Show this help message\n');
  
  console.log(chalk.cyan('Examples:'));
  console.log('  climb config                    # Detailed configuration view');
  console.log('  climb config --raw              # Raw YAML output');
  console.log('  climb config --export > config.yaml  # Export to file');
}

function exportConfiguration() {
  try {
    configManager.load();
    const config = configManager.config;
    
    // Remove any sensitive information or temporary data
    const exportConfig = {
      ...config,
      // Add export metadata
      _exported: {
        timestamp: new Date().toISOString(),
        version: '2.2.0',
        workspace: configManager.getCurrentWorkspace()
      }
    };
    
    console.log(yaml.dump(exportConfig, { 
      indent: 2,
      lineWidth: 120,
      noRefs: true,
      sortKeys: false
    }));
  } catch (error) {
    console.error(chalk.red('Error exporting configuration:'), error.message);
    process.exit(1);
  }
}

function showRawConfiguration() {
  try {
    configManager.load();
    const config = configManager.config;
    
    console.log(chalk.blue('🔧 Raw Configuration\n'));
    console.log(yaml.dump(config, { 
      indent: 2,
      lineWidth: 120,
      noRefs: true,
      sortKeys: false
    }));
  } catch (error) {
    console.error(chalk.red('Error showing raw configuration:'), error.message);
    process.exit(1);
  }
}

function showDetailedConfiguration() {
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
    if (project.path) {
      console.log(`     Path: ${chalk.gray(project.path)}`);
    }
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

  // Show project groups
  if (configManager.config.groups && Object.keys(configManager.config.groups).length > 0) {
    console.log(chalk.yellow('Project Groups:'));
    Object.entries(configManager.config.groups).forEach(([groupName, projects]) => {
      console.log(`  ${chalk.cyan(groupName)}: ${projects.map(p => chalk.gray(p)).join(', ')}`);
    });
    console.log('');
  }

  // Show custom commands
  if (configManager.config.customCommands && Object.keys(configManager.config.customCommands).length > 0) {
    console.log(chalk.yellow('Custom Commands:'));
    Object.entries(configManager.config.customCommands).forEach(([cmdName, cmdConfig]) => {
      console.log(`  ${chalk.cyan(cmdName)}: ${chalk.gray(cmdConfig.description || 'No description')}`);
      console.log(`    Command: ${chalk.gray(cmdConfig.command)}`);
      console.log(`    Target: ${chalk.gray(Array.isArray(cmdConfig.target) ? cmdConfig.target.join(', ') : cmdConfig.target)}`);
      if (cmdConfig.interactive !== undefined) {
        console.log(`    Interactive: ${chalk.gray(cmdConfig.interactive)}`);
      }
      if (cmdConfig.parallel !== undefined) {
        console.log(`    Parallel: ${chalk.gray(cmdConfig.parallel)}`);
      }
    });
    console.log('');
  }

  // Show dependency readiness configuration
  if (configManager.config.dependencyReadiness) {
    console.log(chalk.yellow('Dependency Readiness Configuration:'));
    const readiness = configManager.config.dependencyReadiness;
    if (readiness.maxRetries !== undefined) {
      console.log(`  Max Retries: ${chalk.gray(readiness.maxRetries)}`);
    }
    if (readiness.retryDelay !== undefined) {
      console.log(`  Retry Delay: ${chalk.gray(readiness.retryDelay)}ms`);
    }
    if (readiness.timeout !== undefined) {
      console.log(`  Timeout: ${chalk.gray(readiness.timeout)}ms`);
    }
    console.log('');
  }

  // Show all workspaces
  const allWorkspaces = configManager.listWorkspaces();
  console.log(chalk.yellow('All Workspaces:'));
  allWorkspaces.forEach(workspace => {
    const marker = workspace === currentWorkspace ? '👉' : '  ';
    const nameColor = workspace === currentWorkspace ? chalk.green : chalk.white;
    console.log(`  ${marker} ${nameColor(workspace)}`);
  });
  console.log('');

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
  console.log('');
  console.log(`  ${chalk.gray('# Export configuration')}`);
  console.log(`  ${chalk.green('climb config --export > my-config.yaml')}`);
  console.log('');
  console.log(`  ${chalk.gray('# Show raw configuration')}`);
  console.log(`  ${chalk.green('climb config --raw')}`);
}
