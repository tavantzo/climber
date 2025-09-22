#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const chalk = require('chalk');

const command = process.argv[2];

/**
 * Show enhanced help with custom commands
 */
function showEnhancedHelp() {
  console.log(chalk.blue('Mountain Climber 🏔️'));
  console.log(chalk.gray('A powerful command line tool to handle multiple dockerized services'));
  console.log('');
  
  console.log(chalk.cyan('Usage:'));
  console.log('  climb <command> [options]');
  console.log('');
  
  console.log(chalk.cyan('Core Commands:'));
  console.log('  init      Initialize the climber tool');
  console.log('  up        Bring up all the services');
  console.log('  down      Stop all the services');
  console.log('  ps        Show processes status');
  console.log('  logs      View logs from all services');
  console.log('  restart   Restart all or specific services');
  console.log('  clean     Clean up unused Docker resources');
  console.log('  config    Show current configuration and environment status');
  console.log('  run       Execute custom commands on projects or groups');
  console.log('  workspace Manage workspaces (create, list, switch, delete)');
  console.log('');
  
  // Try to load and show custom commands
  try {
    const configManager = require('./config');
    configManager.load();
    const config = configManager.config;
    
    if (config.customCommands && Object.keys(config.customCommands).length > 0) {
      console.log(chalk.cyan('Custom Commands:'));
      Object.entries(config.customCommands).forEach(([name, command]) => {
        const description = command.description || 'No description';
        const target = Array.isArray(command.target) ? command.target.join(', ') : command.target;
        console.log(`  ${name.padEnd(20)} ${description} (target: ${target})`);
      });
      console.log('');
    }
  } catch (error) {
    // Silently ignore errors when loading config for help
  }
  
  console.log(chalk.cyan('Examples:'));
  console.log('  climb init                    # Initialize configuration');
  console.log('  climb up                      # Start all services');
  console.log('  climb up insights sentinel    # Start specific projects');
  console.log('  climb down                    # Stop all services');
  console.log('  climb logs -f                 # Follow logs from all services');
  console.log('  climb run bundle-install      # Run custom command');
  console.log('  climb workspace list          # List workspaces');
  console.log('');
  
  console.log(chalk.cyan('For more information:'));
  console.log('  climb <command> --help        # Get help for specific command');
  console.log('  climb run --list              # List available custom commands');
}

// Handle help command specially
if (command === 'help' || command === '--help' || command === '-h' || !command) {
  showEnhancedHelp();
  process.exit(0);
}

// Handle workspace command specially since it has subcommands
if (command === 'workspace') {
  const workspaceArgs = process.argv.slice(3); // Skip 'node', 'index.js', 'workspace'
  const workspaceScript = path.join(__dirname, 'workspace.js');

  const child = spawn('node', [workspaceScript, ...workspaceArgs], {
    stdio: 'inherit'
  });

  child.on('close', (code) => {
    process.exit(code);
  });

  child.on('error', (err) => {
    console.error('Error running workspace command:', err.message);
    process.exit(1);
  });
} else if (command === 'run') {
  // Handle run command specially since it has its own help system
  const runArgs = process.argv.slice(3); // Skip 'node', 'index.js', 'run'
  const runScript = path.join(__dirname, 'run.js');

  const child = spawn('node', [runScript, ...runArgs], {
    stdio: 'inherit'
  });

  child.on('close', (code) => {
    process.exit(code);
  });

  child.on('error', (err) => {
    console.error('Error running custom command:', err.message);
    process.exit(1);
  });
} else {
  // For other commands, use the args library
  const args = require('args');

  args.command('init', 'Initialize the climber tool.');
  args.command('up', 'Brings up all the services.', ['u']);
  args.command('down', 'Stops all the services.', ['d']);
  args.command('ps', 'Show processes status.');
  args.command('logs', 'View logs from all services.', ['l']);
  args.command('restart', 'Restart all or specific services.', ['r']);
  args.command('clean', 'Clean up unused Docker resources.');
  args.command('config', 'Show current configuration and environment status.');
  args.command('run', 'Execute custom commands on projects or groups.');

  args.parse(process.argv);
}
