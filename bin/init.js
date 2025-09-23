#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const find = require('find');
const chalk = require('chalk');
const inquirer = require('inquirer');
const readline = require('readline');
const configManager = require('./config');

// Register the autocomplete prompt
// @ts-ignore
inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

const home = process.env.HOME;
const pwd = process.env.PWD;

const config = {
  root: home,
  projects: /** @type {Array<{name: string, path: string, description: string}>} */ ([]),
  environments: {
    default: {
      description: 'Default environment',
      projects: /** @type {string[]} */ ([])
    }
  },
  dependencies: {}
};

// Helper function to get directory contents for tab completion
function getDirectoryContents(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      return [];
    }

    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    return items
      .filter(item => item.isDirectory())
      .map(item => item.name)
      .sort();
  } catch (error) {
    return [];
  }
}

// Helper function to check if path exists and is a directory
function isValidDirectory(dirPath) {
  try {
    const stat = fs.statSync(dirPath);
    return stat.isDirectory();
  } catch (error) {
    return false;
  }
}

// Shell-like tab completion for directory paths
// eslint-disable-next-line no-unused-vars
function getTabCompletion(input) {
  if (!input || input.trim() === '') {
    return { completed: home || process.env.HOME || '/', matches: [] };
  }

  const originalInput = input.trim();
  let inputPath = originalInput;

  // Handle ~ expansion for home directory
  if (inputPath.startsWith('~')) {
    const homeDir = home || process.env.HOME || '/';
    if (inputPath === '~') {
      inputPath = homeDir;
    } else if (inputPath.startsWith('~/')) {
      inputPath = path.join(homeDir, inputPath.slice(2));
    } else {
      // Handle ~username (though we'll just use current user's home)
      inputPath = path.join(homeDir, inputPath.slice(1));
    }
  }

  // Resolve relative paths from current working directory
  const resolvedPath = path.resolve(inputPath);
  const dirname = path.dirname(resolvedPath);
  const basename = path.basename(resolvedPath);

  // If the path exists and is a directory, show its contents
  if (isValidDirectory(resolvedPath)) {
    const contents = getDirectoryContents(resolvedPath);
    return { completed: originalInput, matches: contents };
  }

  // If the path doesn't exist, try to complete from the parent directory
  if (isValidDirectory(dirname)) {
    const contents = getDirectoryContents(dirname);
    const matchingContents = contents.filter(item =>
      item.toLowerCase().startsWith(basename.toLowerCase())
    );

    if (matchingContents.length === 1) {
      // Single match - return the completed path
      const completedPath = path.join(dirname, matchingContents[0]);
      // Convert back to original format, preserving the prefix
      const returnPath = convertToOriginalFormat(completedPath, originalInput);
      return {
        completed: returnPath,
        matches: [matchingContents[0]]
      };
    } else if (matchingContents.length > 1) {
      // Multiple matches - return the common prefix and all matches
      const commonPrefix = getCommonPrefix(matchingContents);
      const completedPath = path.join(dirname, commonPrefix);
      // Convert back to original format, preserving the prefix
      const returnPath = convertToOriginalFormat(completedPath, originalInput);
      return {
        completed: returnPath,
        matches: matchingContents
      };
    }
  }

  // No matches found
  return { completed: originalInput, matches: [] };
}

// Helper function to convert resolved path back to original format
function convertToOriginalFormat(resolvedPath, originalInput) {
  // If original input was using ~, convert back
  if (originalInput.startsWith('~')) {
    const homeDir = home || process.env.HOME || '/';
    if (resolvedPath.startsWith(homeDir)) {
      return '~' + resolvedPath.slice(homeDir.length);
    }
  }

  // If original input was relative (starts with ./ or ../), preserve the prefix
  if (originalInput.startsWith('./') || originalInput.startsWith('../')) {
    // Extract the prefix (./ or ../)
    const prefix = originalInput.match(/^(\.\.?\/)/)?.[1] || '';

    // Get the relative path from the current directory
    const currentDir = process.cwd();
    const relativePath = path.relative(currentDir, resolvedPath);

    // If the relative path starts with the same prefix, use it
    if (relativePath.startsWith(prefix)) {
      return relativePath;
    }

    // For relative paths, we need to construct the path differently
    // The resolvedPath is the full path, but we want to maintain the relative context
    const pathWithoutPrefix = originalInput.slice(prefix.length);
    const resolvedPathWithoutPrefix = path.resolve(pathWithoutPrefix);
    const relativeFromResolved = path.relative(resolvedPathWithoutPrefix, resolvedPath);

    return prefix + relativeFromResolved;
  }

  // If original input was relative but not ./ or ../, try to make it relative to current dir
  if (!originalInput.startsWith('/') && !originalInput.startsWith('~')) {
    const currentDir = process.cwd();
    const relativePath = path.relative(currentDir, resolvedPath);

    // Only use relative path if it's actually shorter
    if (relativePath.length < resolvedPath.length && !relativePath.startsWith('..')) {
      return relativePath;
    }
  }

  // Default to resolved path
  return resolvedPath;
}

// Helper function to find common prefix
function getCommonPrefix(strings) {
  if (strings.length === 0) return '';
  if (strings.length === 1) return strings[0];

  let prefix = '';
  const first = strings[0];

  for (let i = 0; i < first.length; i++) {
    const char = first[i];
    if (strings.every(str => str[i] === char)) {
      prefix += char;
        } else {
      break;
    }
  }

  return prefix;
}

// Custom prompt with system-native tab completion
async function promptWithTabCompletion(question, defaultValue = '') {
  const prompt = inquirer.createPromptModule();

  const answer = await prompt([
    {
      type: 'autocomplete',
      name: 'path',
      message: question,
      default: defaultValue,
      source: async (answers, input) => {
        // Use system's native path completion
        if (!input || input.trim() === '') {
          return [defaultValue];
        }

        const inputPath = input.trim();
        let searchPath = inputPath;

        // Handle ~ expansion
        if (inputPath.startsWith('~')) {
          const homeDir = process.env.HOME || process.env.USERPROFILE || '/';
          searchPath = inputPath.replace('~', homeDir);
        }

        // Resolve the path
        const resolvedPath = path.resolve(searchPath);
        const dirname = path.dirname(resolvedPath);
        const basename = path.basename(resolvedPath);

        try {
          // If the path exists and is a directory, show its contents
          if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
            const contents = fs.readdirSync(resolvedPath, { withFileTypes: true })
              .filter(item => item.isDirectory())
              .map(item => item.name)
              .sort();

            return contents;
          }

          // If the path doesn't exist, try to complete from the parent directory
          if (fs.existsSync(dirname) && fs.statSync(dirname).isDirectory()) {
            const contents = fs.readdirSync(dirname, { withFileTypes: true })
              .filter(item => item.isDirectory())
              .map(item => item.name)
              .filter(item => item.toLowerCase().startsWith(basename.toLowerCase()))
              .sort();

            return contents;
          }
        } catch (error) {
          // If there's an error, return empty array
        }

        return [];
      }
    }
  ]);

  return answer.path || defaultValue;
}

// Simple yes/no prompt
function promptYesNo(question, defaultValue = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const defaultText = defaultValue ? '[Y/n]' : '[y/N]';
    rl.question(chalk.green(question + ' ' + defaultText + ' '), (answer) => {
      rl.close();
      if (!answer) {
        resolve(defaultValue);
      } else {
        resolve(answer.toLowerCase().startsWith('y'));
      }
    });
  });
}

// Simple input prompt
function promptInput(question, defaultValue = '') {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(chalk.green(question), (answer) => {
      rl.close();
      resolve(answer || defaultValue);
    });
  });
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const workspaceName = args.includes('--workspace') ? args[args.indexOf('--workspace') + 1] : null;
  const workspaceDescription = args.includes('--description') ? args[args.indexOf('--description') + 1] : '';

  console.log(chalk.blue('🚀 Welcome to Mountain Climber Configuration Setup!\n'));

  if (workspaceName) {
    console.log(chalk.cyan(`📁 Creating workspace: ${workspaceName}`));
    if (workspaceDescription) {
      console.log(chalk.gray(`   Description: ${workspaceDescription}\n`));
    }
  } else {
    // Check if we're in a workspace context
    const currentWorkspace = configManager.getCurrentWorkspace();
    console.log(chalk.cyan(`📁 Current workspace: ${currentWorkspace}\n`));
  }

  // Check for import option
  const importFile = args.includes('--import') ? args[args.indexOf('--import') + 1] : null;
  if (importFile) {
    try {
      console.log(chalk.blue(`📥 Importing configuration from: ${importFile}\n`));

      if (workspaceName) {
        // Create workspace from import
        configManager.createWorkspaceFromImport(workspaceName, importFile, true, workspaceDescription);
        console.log(chalk.green('✅ Configuration imported successfully!\n'));
        return;
      } else {
        // Import into current workspace
        const importedConfig = configManager.importConfiguration(importFile, true);
        configManager.save(importedConfig);
        console.log(chalk.green('✅ Configuration imported successfully!\n'));
        return;
      }
    } catch (error) {
      console.error(chalk.red('❌ Failed to import configuration:'), error.message);
      process.exit(1);
    }
  }

  // Ask if user wants to import configuration
  const shouldImport = await promptYesNo('Would you like to import an existing configuration file?', false);
  if (shouldImport) {
    const importPath = await promptWithTabCompletion('Enter the path to the configuration file: ', '');
    if (importPath && fs.existsSync(importPath)) {
      try {
        console.log(chalk.blue(`📥 Importing configuration from: ${importPath}\n`));

        if (workspaceName) {
          // Create workspace from import
          configManager.createWorkspaceFromImport(workspaceName, importPath, true, workspaceDescription);
          console.log(chalk.green('✅ Configuration imported successfully!\n'));
          return;
        } else {
          // Import into current workspace
          const importedConfig = configManager.importConfiguration(importPath, true);
          configManager.save(importedConfig);
          console.log(chalk.green('✅ Configuration imported successfully!\n'));
          return;
        }
      } catch (error) {
        console.error(chalk.red('❌ Failed to import configuration:'), error.message);
        console.log(chalk.yellow('Continuing with manual setup...\n'));
      }
    } else {
      console.log(chalk.yellow('Invalid file path. Continuing with manual setup...\n'));
    }
  }

  try {
    // Step 1: Select root directory with tab completion
    const defaultPath = home ? '~' : '/';
    const rootPath = await promptWithTabCompletion(`Enter the root directory of your projects (current: ${pwd}): `, defaultPath);
    if (!rootPath) {
      console.log(chalk.red('Configuration cancelled.'));
      process.exit(1);
    }

    config.root = path.resolve(rootPath);
    console.log(chalk.green(`✓ Root directory set to: ${config.root}\n`));

    // Step 2: Auto-discover or manual project setup
    const autoDiscover = await promptYesNo('Would you like to auto-discover directories containing docker-compose files?', true);

    if (autoDiscover) {
      console.log(chalk.blue(`🔍 Scanning ${config.root} for docker-compose files...`));

      await new Promise((resolve) => {
        find.file(/docker-compose\.ya?ml/, /** @type {string} */ (config.root), (files) => {
          if (!files || files.length === 0) {
            console.log(chalk.yellow('No docker-compose files found. Switching to manual mode.\n'));
            resolve(undefined);
    } else {
            files.forEach((file) => {
              const projectPath = path.dirname(file);
              const projectName = projectPath.split(path.sep).pop();
              if (projectName) {
                config.projects.push({
                  name: projectName,
                  path: path.relative(/** @type {string} */ (config.root), projectPath),
                  description: `Auto-discovered project: ${projectName}`
                });
                config.environments.default.projects.push(projectName);
              }
            });
            console.log(chalk.green(`✓ Found ${config.projects.length} projects with docker-compose files\n`));
            resolve(undefined);
          }
        });
      });

      // Ask if user wants to configure readiness checks for auto-discovered projects
      if (config.projects.length > 0) {
        const configureReadinessForDiscovered = await promptYesNo('Would you like to configure dependency readiness checking for the discovered projects?', false);
        if (configureReadinessForDiscovered) {
          for (const project of config.projects) {
            const configureReadiness = await promptYesNo(`Configure readiness checking for "${project.name}"?`, false);
            if (configureReadiness) {
              project['readiness'] = await configureReadinessCheck(project.name);
            }
          }
        }
      }
    }

    // Step 3: Manual project addition if no auto-discovery or user wants to add more
    if (config.projects.length === 0 || !autoDiscover) {
      await addProjectsManually();
    }

    if (config.projects.length === 0) {
      console.log(chalk.red('No projects configured. Exiting.'));
      process.exit(1);
    }

    // Step 4: Configure additional environments
    await configureEnvironments();

    // Step 5: Configure dependencies
    await configureDependencies();

    // Step 5: Configure global dependency readiness settings
    await configureGlobalDependencySettings();

    // Step 6: Configure custom commands
    await configureCustomCommands();

    // Step 7: Show configuration summary and save
    await showConfigurationAndSave();

  } catch (error) {
    console.error(chalk.red('Error during configuration:'), error.message);
    process.exit(1);
  }
}

async function configureReadinessCheck(projectName) {
  console.log(chalk.cyan(`\n🔍 Configuring dependency readiness checking for "${projectName}"`));

  const readinessTypes = [
    { name: 'HTTP Health Check - Check if service responds to HTTP endpoint', value: 'http' },
    { name: 'Port Availability - Check if port is open and accepting connections', value: 'port' },
    { name: 'Custom Command - Execute custom script to check service readiness', value: 'command' },
    { name: 'Docker Service Status - Check if Docker container is running and healthy', value: 'docker' }
  ];

  const { readinessType } = await inquirer['prompt']([{
    type: 'list',
    name: 'readinessType',
    message: 'Select readiness check type:',
    choices: readinessTypes
  }]);

  const readiness = {
    type: readinessType,
    config: {},
    timeout: 5000
  };

  // Configure based on readiness type
  switch (readinessType) {
    case 'http':
      const httpUrl = await promptInput('Enter health check URL (e.g., http://localhost:3000/health): ');
      const httpTimeout = await promptInput('Enter timeout in milliseconds (default: 5000): ', '5000');
      readiness.config.url = httpUrl.trim();
      readiness.timeout = parseInt(httpTimeout.trim(), 10) || 5000;
      break;

    case 'port':
      const portHost = await promptInput('Enter host (default: localhost): ', 'localhost');
      const portPort = await promptInput('Enter port number: ');
      const portTimeout = await promptInput('Enter timeout in milliseconds (default: 5000): ', '5000');
      readiness.config.host = portHost.trim() || 'localhost';
      readiness.config.port = parseInt(portPort.trim(), 10);
      readiness.timeout = parseInt(portTimeout.trim(), 10) || 5000;
      break;

    case 'command':
      const commandCmd = await promptInput('Enter command to execute (e.g., curl -f http://localhost:3000/health): ');
      const commandTimeout = await promptInput('Enter timeout in milliseconds (default: 5000): ', '5000');
      readiness.config.command = commandCmd.trim();
      readiness.timeout = parseInt(commandTimeout.trim(), 10) || 5000;
      break;

    case 'docker':
      const dockerContainer = await promptInput('Enter container name or pattern: ');
      const dockerService = await promptInput('Enter service name: ');
      const dockerTimeout = await promptInput('Enter timeout in milliseconds (default: 5000): ', '5000');
      readiness.config.container = dockerContainer.trim();
      readiness.config.service = dockerService.trim();
      readiness.timeout = parseInt(dockerTimeout.trim(), 10) || 5000;
      break;
  }

  // Show configuration summary
  console.log(chalk.green(`\n✓ Readiness check configured for "${projectName}":`));
  console.log(chalk.gray(`   Type: ${readinessType}`));
  console.log(chalk.gray(`   Config: ${JSON.stringify(readiness.config, null, 2)}`));
  console.log(chalk.gray(`   Timeout: ${readiness.timeout}ms\n`));

  return readiness;
}

async function addProjectsManually() {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const name = await promptInput('Enter project name (or press Enter to finish): ');
    if (!name || name.trim().length === 0) {
      break;
    }

    const projectName = name.trim();
    const projectPath = await promptWithTabCompletion(`Enter path for project "${projectName}" (relative to ${config.root}): `, projectName);
    const description = await promptInput(`Enter description for "${projectName}" (optional): `, `Project: ${projectName}`);

    const project = {
      name: projectName,
      path: projectPath.trim(),
      description: description.trim()
    };

    // Configure dependency readiness checking
    const configureReadiness = await promptYesNo(`Would you like to configure dependency readiness checking for "${projectName}"?`, false);
    if (configureReadiness) {
      project.readiness = await configureReadinessCheck(projectName);
    }

    config.projects.push(project);
    config.environments.default.projects.push(projectName);

    console.log(chalk.green(`✓ Added project: ${projectName}\n`));
  }
}

async function configureEnvironments() {
  const addEnvironments = await promptYesNo('Would you like to configure additional environments?', false);
  if (!addEnvironments) {
    return;
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const envName = await promptInput('Enter environment name (or press Enter to finish): ');
    if (!envName || envName.trim().length === 0) {
      break;
    }

    const env = envName.trim();
    const description = await promptInput(`Enter description for "${env}" environment: `, `Environment: ${env}`);

    console.log(chalk.blue('\nAvailable projects:'));
    config.projects.forEach((project, index) => {
      console.log(chalk.cyan(`  ${index + 1}. ${project.name} - ${project.description}`));
    });

    const projectNumbers = await promptInput(`Enter project numbers for "${env}" environment (comma-separated, e.g., 1,3,5): `);
    const selectedProjects = projectNumbers.split(',')
      .map(num => parseInt(num.trim()) - 1)
      .filter(index => index >= 0 && index < config.projects.length)
      .map(index => config.projects[index].name);

    config.environments[env] = {
      description: description.trim(),
      projects: selectedProjects
    };

    console.log(chalk.green(`✓ Added environment: ${env}\n`));
  }
}

async function configureDependencies() {
  const addDependencies = await promptYesNo('Would you like to configure service dependencies?', false);
  if (!addDependencies) {
    return;
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    console.log(chalk.blue('\nAvailable projects:'));
    config.projects.forEach((project, index) => {
      console.log(chalk.cyan(`  ${index + 1}. ${project.name}`));
    });

    const projectNum = await promptInput('Enter project number that has dependencies (or press Enter to finish): ');
    if (!projectNum || projectNum.trim().length === 0) {
      break;
    }

    const projectIndex = parseInt(projectNum.trim()) - 1;
    if (projectIndex < 0 || projectIndex >= config.projects.length) {
      console.log(chalk.red('Invalid project number.'));
      continue;
    }

    const project = config.projects[projectIndex];
    const depNumbers = await promptInput(`Enter dependency project numbers for "${project.name}" (comma-separated): `);
    const dependencies = depNumbers.split(',')
      .map(num => parseInt(num.trim()) - 1)
      .filter(index => index >= 0 && index < config.projects.length)
      .map(index => config.projects[index].name);

    if (dependencies.length > 0) {
      config.dependencies[project.name] = dependencies;
      console.log(chalk.green(`✓ Added dependencies for: ${project.name}\n`));
    }
  }
}

async function configureGlobalDependencySettings() {
  // Check if any projects have readiness checks configured
  const projectsWithReadiness = config.projects.filter(project => project['readiness']);

  if (projectsWithReadiness.length === 0) {
    return; // No readiness checks configured, skip global settings
  }

  console.log(chalk.cyan(`\n🔧 Configuring global dependency readiness settings`));
  console.log(chalk.gray(`Found ${projectsWithReadiness.length} projects with readiness checks configured.`));

  const configureGlobal = await promptYesNo('Would you like to configure global dependency readiness settings?', false);
  if (!configureGlobal) {
    return;
  }

  const maxRetries = await promptInput('Enter maximum retry attempts (default: 30): ', '30');
  const retryDelay = await promptInput('Enter retry delay in milliseconds (default: 2000): ', '2000');
  const defaultTimeout = await promptInput('Enter default timeout in milliseconds (default: 5000): ', '5000');

  config.dependencyReadiness = {
    maxRetries: parseInt(maxRetries.trim(), 10) || 30,
    retryDelay: parseInt(retryDelay.trim(), 10) || 2000,
    timeout: parseInt(defaultTimeout.trim(), 10) || 5000
  };

  console.log(chalk.green(`\n✓ Global dependency readiness settings configured:`));
  console.log(chalk.gray(`   Max Retries: ${config.dependencyReadiness.maxRetries}`));
  console.log(chalk.gray(`   Retry Delay: ${config.dependencyReadiness.retryDelay}ms`));
  console.log(chalk.gray(`   Default Timeout: ${config.dependencyReadiness.timeout}ms\n`));
}

async function configureCustomCommands() {
  console.log(chalk.cyan(`\n🔧 Configuring custom commands`));
  console.log(chalk.gray(`Custom commands allow you to run project-specific commands like bundle exec, npm run, etc.`));

  const addCustomCommands = await promptYesNo('Would you like to configure custom commands?', false);
  if (!addCustomCommands) {
    return;
  }

  config.customCommands = {};
  config.groups = {};

  // Configure project groups first
  const addGroups = await promptYesNo('Would you like to create project groups (e.g., ruby-projects, frontend-projects)?', false);
  if (addGroups) {
    await configureProjectGroups();
  }

  // Configure custom commands
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const commandName = await promptInput('Enter custom command name (or press Enter to finish): ');
    if (!commandName || commandName.trim().length === 0) {
      break;
    }

    const command = await configureCustomCommand(commandName.trim());
    config.customCommands[commandName.trim()] = command;

    console.log(chalk.green(`✓ Added custom command: ${commandName.trim()}\n`));
  }
}

async function configureProjectGroups() {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const groupName = await promptInput('Enter group name (or press Enter to finish): ');
    if (!groupName || groupName.trim().length === 0) {
      break;
    }

    const projectChoices = config.projects.map(project => ({
      name: `${project.name}${project.description ? ` - ${project.description}` : ''}`,
      value: project.name,
      short: project.name
    }));

    const { selectedProjects } = await inquirer['prompt']([{
      type: 'checkbox',
      name: 'selectedProjects',
      message: `Select projects for group "${groupName.trim()}":`,
      choices: projectChoices
    }]);

    if (selectedProjects.length > 0) {
      config.groups[groupName.trim()] = selectedProjects;
      console.log(chalk.green(`✓ Created group "${groupName.trim()}" with projects: ${selectedProjects.join(', ')}\n`));
    } else {
      console.log(chalk.yellow(`Skipping empty group "${groupName.trim()}"\n`));
    }
  }
}

async function configureCustomCommand(commandName) {
  console.log(chalk.cyan(`\n🔧 Configuring custom command: "${commandName}"`));

  const description = await promptInput(`Enter description for "${commandName}" (optional): `);
  const command = await promptInput(`Enter command to execute (e.g., bundle exec rails console): `);

  // Configure default target
  const targetChoices = [
    { name: 'All projects', value: 'all' },
    { name: 'Specific projects', value: 'specific' },
    { name: 'Project group', value: 'group' }
  ];

  const { targetType } = await inquirer['prompt']([{
    type: 'list',
    name: 'targetType',
    message: 'Default target for this command:',
    choices: targetChoices
  }]);

  let defaultTarget = 'all';

  switch (targetType) {
    case 'specific':
      const projectChoices = config.projects.map(project => ({
        name: `${project.name}${project.description ? ` - ${project.description}` : ''}`,
        value: project.name,
        short: project.name
      }));

      const { selectedProjects } = await inquirer['prompt']([{
        type: 'checkbox',
        name: 'selectedProjects',
        message: 'Select default target projects:',
        choices: projectChoices
      }]);

      if (selectedProjects.length > 0) {
        defaultTarget = selectedProjects;
      }
      break;

    case 'group':
      if (Object.keys(config.groups || {}).length > 0) {
        const groupChoices = Object.keys(config.groups).map(groupName => ({
          name: `${groupName} (${config.groups[groupName].join(', ')})`,
          value: groupName,
          short: groupName
        }));

        const { selectedGroup } = await inquirer['prompt']([{
          type: 'list',
          name: 'selectedGroup',
          message: 'Select default target group:',
          choices: groupChoices
        }]);

        defaultTarget = selectedGroup;
      } else {
        console.log(chalk.yellow('No groups available, using "all" as default target'));
      }
      break;
  }

  // Configure execution options
  const interactive = await promptYesNo('Run in interactive mode by default?', false);
  const parallel = await promptYesNo('Run in parallel across projects by default?', false);

  const commandConfig = {
    description: description.trim(),
    command: command.trim(),
    target: defaultTarget,
    interactive,
    parallel
  };

  // Show configuration summary
  console.log(chalk.green(`\n✓ Custom command "${commandName}" configured:`));
  console.log(chalk.gray(`   Description: ${commandConfig.description || 'None'}`));
  console.log(chalk.gray(`   Command: ${commandConfig.command}`));
  console.log(chalk.gray(`   Default Target: ${Array.isArray(commandConfig.target) ? commandConfig.target.join(', ') : commandConfig.target}`));
  console.log(chalk.gray(`   Interactive: ${commandConfig.interactive ? 'Yes' : 'No'}`));
  console.log(chalk.gray(`   Parallel: ${commandConfig.parallel ? 'Yes' : 'No'}\n`));

  return commandConfig;
}

async function showConfigurationAndSave() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const workspaceName = args.includes('--workspace') ? args[args.indexOf('--workspace') + 1] : null;
  const workspaceDescription = args.includes('--description') ? args[args.indexOf('--description') + 1] : '';

  console.log(chalk.blue('\n📋 Configuration Summary:'));
  console.log(chalk.cyan(JSON.stringify(config, null, 2)));

  const save = await promptYesNo('Would you like to save this configuration?', true);
  if (!save) {
    console.log(chalk.red('Configuration aborted.'));
    process.exit(1);
  }

  try {
    if (workspaceName) {
      // Create the workspace first
      configManager.createWorkspace(workspaceName, workspaceDescription);
      console.log(chalk.green(`✓ Workspace "${workspaceName}" created successfully!`));

      // Switch to the new workspace
      configManager.switchWorkspace(workspaceName);
      console.log(chalk.green(`✓ Switched to workspace "${workspaceName}"`));
    }

    // Save the configuration
    configManager.save(config);
    console.log(chalk.green('✓ Configuration saved successfully!'));
    console.log(chalk.blue('\n💡 Tips:'));
    console.log(chalk.yellow('  - Use CLIMBER_ENV=environment_name to switch environments'));
    console.log(chalk.yellow('  - Run "climb up" to start all services in dependency order'));
    console.log(chalk.yellow(`  - Edit ~/.climber-config/workspaces/${configManager.getCurrentWorkspace()}.yaml to modify configuration`));
    console.log(chalk.yellow('  - Use "climb workspace list" to see all workspaces'));
  } catch (error) {
    console.error(chalk.red('Error saving configuration:'), error.message);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error(chalk.red('Unexpected error:'), error);
  process.exit(1);
});