#!/usr/bin/env node
const chalk = require('chalk');
const configManager = require('./config');
const {
  executeCustomCommands,
  listCustomCommands,
  interactiveCommandExecution
} = require('./custom-commands');

/**
 * Parse command line arguments
 * @returns {Object} - Parsed arguments
 */
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    interactive: false,
    parallel: false,
    continueOnError: false,
    list: false
  };

  const commandArgs = [];
  let commandName = null;
  let target = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--interactive':
      case '-i':
        options.interactive = true;
        break;
      case '--parallel':
      case '-p':
        options.parallel = true;
        break;
      case '--continue-on-error':
      case '-c':
        options.continueOnError = true;
        break;
      case '--list':
      case '-l':
        options.list = true;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
      default:
        if (arg.startsWith('--')) {
          console.error(chalk.red(`Unknown option: ${arg}`));
          process.exit(1);
        } else {
          commandArgs.push(arg);
        }
    }
  }

  // Parse command and target
  if (commandArgs.length > 0) {
    commandName = commandArgs[0];
    if (commandArgs.length > 1) {
      target = commandArgs.slice(1);
    }
  }

  return { commandName, target, options };
}

/**
 * Show help information
 */
function showHelp() {
  console.log(chalk.blue('Mountain Climber - Custom Commands Runner'));
  console.log('');
  console.log(chalk.cyan('Usage:'));
  console.log('  climb run <command> [targets...] [options]');
  console.log('  climb run [options]');
  console.log('');
  console.log(chalk.cyan('Arguments:'));
  console.log('  command    Name of the custom command to run');
  console.log('  targets    Project names, group names, or "all" (optional if command has default target)');
  console.log('');
  console.log(chalk.cyan('Options:'));
  console.log('  -i, --interactive        Run command in interactive mode');
  console.log('  -p, --parallel          Run commands in parallel across projects');
  console.log('  -c, --continue-on-error Continue execution even if some commands fail');
  console.log('  -l, --list              List available custom commands');
  console.log('  -h, --help              Show this help message');
  console.log('');
  console.log(chalk.cyan('Examples:'));
  console.log('  climb run bundle-install                      # Run on command default target');
  console.log('  climb run bundle-install insights sentinel    # Run on specific projects');
  console.log('  climb run bundle-install ruby-projects        # Run on project group');
  console.log('  climb run bundle-install all                  # Run on all projects');
  console.log('  climb run bundle-install --parallel           # Run in parallel');
  console.log('  climb run --list                              # List available commands');
  console.log('  climb run                                     # Interactive mode');
  console.log('');
  console.log(chalk.cyan('Project Groups:'));
  console.log('  Define groups in your configuration to run commands on multiple related projects.');
  console.log('  Example: ruby-projects: [insights, sentinel, api]');
}

/**
 * Main execution function
 */
async function main() {
  try {
    const { commandName, target, options } = parseArguments();

    // Load configuration
    configManager.load();
    const config = configManager.config;

    // Handle list command
    if (options.list) {
      listCustomCommands(config);
      return;
    }

    // Handle interactive mode
    if (!commandName) {
      await interactiveCommandExecution(config, options);
      return;
    }

    // Get default target from command configuration if not specified
    const commandConfig = config.customCommands?.[commandName];
    const defaultTarget = commandConfig?.target || 'all';
    const finalTarget = target || defaultTarget;

    // Execute the custom command
    await executeCustomCommands(finalTarget, commandName, config, options);

  } catch (error) {
    console.error(chalk.red('Error running custom command:'), error.message);
    process.exit(1);
  }
}

// Only run if this file is executed directly, not when imported
if (require.main === module) {
  main();
}

// Export functions for testing
module.exports = {
  parseArguments,
  showHelp,
  main
};
