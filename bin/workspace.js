#!/usr/bin/env node
const chalk = require('chalk');
const configManager = require('./config');

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  try {
    switch (command) {
      case 'list':
      case 'ls':
        listWorkspaces();
        break;
      case 'create':
        await createWorkspace(args[1], args[2]);
        break;
      case 'delete':
      case 'remove':
        await deleteWorkspace(args[1]);
        break;
      case 'switch':
        await switchWorkspace(args[1]);
        break;
      case 'current':
        showCurrentWorkspace();
        break;
      case 'info':
        showWorkspaceInfo(args[1]);
        break;
      default:
        showHelp();
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

function listWorkspaces() {
  const workspaces = configManager.listWorkspaces();
  const current = configManager.getCurrentWorkspace();

  console.log(chalk.blue('📁 Available Workspaces:\n'));

  if (workspaces.length === 0) {
    console.log(chalk.yellow('No workspaces found.'));
    console.log(chalk.gray('Run "climb workspace create <name>" to create your first workspace.'));
    return;
  }

  workspaces.forEach(workspace => {
    const info = configManager.getWorkspaceInfo(workspace);
    const isCurrent = workspace === current;
    const marker = isCurrent ? '👉' : '  ';
    const nameColor = isCurrent ? chalk.green : chalk.white;

    console.log(`  ${marker} ${nameColor(workspace)}`);
    if (info && info.description) {
      console.log(chalk.gray(`     ${info.description}`));
    }
    if (info && info.created) {
      const created = new Date(info.created).toLocaleDateString();
      console.log(chalk.gray(`     Created: ${created}`));
    }
    console.log('');
  });

  console.log(chalk.blue('💡 Usage:'));
  console.log(chalk.gray('  climb workspace switch <name>  # Switch to a workspace'));
  console.log(chalk.gray('  CLIMBER_WORKSPACE=<name> climb up  # Use workspace for single command'));
}

async function createWorkspace(name, description = '') {
  if (!name) {
    console.error(chalk.red('Error: Workspace name is required'));
    console.log(chalk.yellow('Usage: climb workspace create <name> [description]'));
    process.exit(1);
  }

  try {
    // Check if workspace already exists
    if (configManager.listWorkspaces().includes(name)) {
      console.error(chalk.red(`Error: Workspace "${name}" already exists`));
      process.exit(1);
    }

    console.log(chalk.blue(`🚀 Creating workspace "${name}"...`));
    console.log(chalk.gray(`   Description: ${description || 'No description provided'}`));
    console.log(chalk.yellow('\n📋 Starting workspace configuration...'));
    console.log(chalk.gray('   This will guide you through setting up your workspace.'));

    // Trigger the init process with workspace name
    const { spawn } = require('child_process');
    const path = require('path');
    const initScript = path.join(__dirname, 'init.js');

    const child = spawn('node', [initScript, '--workspace', name, '--description', description], {
      stdio: 'inherit'
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(chalk.green(`\n✓ Workspace "${name}" created and configured successfully!`));
        console.log(chalk.blue(`\nYou can now use: climb up, climb ps, climb logs, etc.`));
      } else {
        console.log(chalk.red(`\n❌ Workspace creation cancelled or failed.`));
        console.log(chalk.gray(`   No workspace was created.`));
      }
    });

    child.on('error', (error) => {
      console.error(chalk.red(`Error running init: ${error.message}`));
      console.log(chalk.red(`\n❌ Workspace creation failed.`));
      console.log(chalk.gray(`   No workspace was created.`));
    });

  } catch (error) {
    console.error(chalk.red('Error creating workspace:'), error.message);
    process.exit(1);
  }
}

async function deleteWorkspace(name) {
  if (!name) {
    console.error(chalk.red('Error: Workspace name is required'));
    console.log(chalk.yellow('Usage: climb workspace delete <name>'));
    process.exit(1);
  }

  try {
    configManager.deleteWorkspace(name);
    console.log(chalk.green(`✓ Workspace "${name}" deleted successfully`));
  } catch (error) {
    console.error(chalk.red('Error deleting workspace:'), error.message);
    process.exit(1);
  }
}

async function switchWorkspace(name) {
  if (!name) {
    console.error(chalk.red('Error: Workspace name is required'));
    console.log(chalk.yellow('Usage: climb workspace switch <name>'));
    process.exit(1);
  }

  try {
    configManager.switchWorkspace(name);
    console.log(chalk.green(`✓ Switched to workspace "${name}"`));
    console.log(chalk.blue('\nCurrent workspace:'), chalk.cyan(name));
  } catch (error) {
    console.error(chalk.red('Error switching workspace:'), error.message);
    process.exit(1);
  }
}

function showCurrentWorkspace() {
  const current = configManager.getCurrentWorkspace();
  const info = configManager.getWorkspaceInfo(current);

  console.log(chalk.blue('📁 Current Workspace:'), chalk.cyan(current));

  if (info) {
    if (info.description) {
      console.log(chalk.yellow('Description:'), info.description);
    }
    if (info.created) {
      const created = new Date(info.created).toLocaleDateString();
      console.log(chalk.yellow('Created:'), created);
    }
  }

  console.log(chalk.blue('\n💡 Usage:'));
  console.log(chalk.gray('  climb workspace list     # List all workspaces'));
  console.log(chalk.gray('  climb workspace switch <name>  # Switch workspace'));
}

function showWorkspaceInfo(name) {
  if (!name) {
    console.error(chalk.red('Error: Workspace name is required'));
    console.log(chalk.yellow('Usage: climb workspace info <name>'));
    process.exit(1);
  }

  const info = configManager.getWorkspaceInfo(name);
  if (!info) {
    console.error(chalk.red(`Workspace "${name}" not found`));
    process.exit(1);
  }

  console.log(chalk.blue(`📁 Workspace: ${name}\n`));
  console.log(chalk.yellow('Description:'), info.description || 'No description');
  console.log(chalk.yellow('Created:'), new Date(info.created).toLocaleDateString());
  console.log(chalk.yellow('Config File:'), info.configFile);

  // Try to load and show configuration details
  try {
    const originalWorkspace = configManager.currentWorkspace;
    configManager.currentWorkspace = name;
    configManager.load();

    console.log(chalk.yellow('\nConfiguration:'));
    console.log(chalk.gray('  Root Directory:'), /** @type {any} */ (configManager.config).root || 'Not set');
    console.log(chalk.gray('  Projects:'), /** @type {any} */ (configManager.config).projects?.length || 0);
    console.log(chalk.gray('  Environments:'), Object.keys(/** @type {any} */ (configManager.config).environments || {}).length);

    configManager.currentWorkspace = originalWorkspace;
  } catch (error) {
    console.log(chalk.yellow('\nConfiguration:'), chalk.red('Error loading config'));
  }
}

function showHelp() {
  console.log(chalk.blue('🏔️  Mountain Climber Workspace Management\n'));
  console.log(chalk.yellow('Available commands:'));
  console.log(chalk.gray('  list, ls          List all workspaces'));
  console.log(chalk.gray('  create <name>     Create a new workspace'));
  console.log(chalk.gray('  delete <name>     Delete a workspace'));
  console.log(chalk.gray('  switch <name>     Switch to a workspace'));
  console.log(chalk.gray('  current           Show current workspace'));
  console.log(chalk.gray('  info <name>       Show workspace information'));
  console.log(chalk.gray('  help              Show this help message'));

  console.log(chalk.blue('\n💡 Examples:'));
  console.log(chalk.gray('  climb workspace list'));
  console.log(chalk.gray('  climb workspace create my-project "My awesome project"'));
  console.log(chalk.gray('  climb workspace switch my-project'));
  console.log(chalk.gray('  CLIMBER_WORKSPACE=my-project climb up'));

  console.log(chalk.blue('\n📝 Notes:'));
  console.log(chalk.gray('  - Each workspace has its own configuration'));
  console.log(chalk.gray('  - Use CLIMBER_WORKSPACE env var for single commands'));
  console.log(chalk.gray('  - Run "climb init" after creating a workspace'));
}

main();
