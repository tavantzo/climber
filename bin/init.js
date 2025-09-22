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
      let returnPath = convertToOriginalFormat(completedPath, originalInput);
      return {
        completed: returnPath,
        matches: [matchingContents[0]]
      };
    } else if (matchingContents.length > 1) {
      // Multiple matches - return the common prefix and all matches
      const commonPrefix = getCommonPrefix(matchingContents);
      const completedPath = path.join(dirname, commonPrefix);
      // Convert back to original format, preserving the prefix
      let returnPath = convertToOriginalFormat(completedPath, originalInput);
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

    // Step 6: Show configuration summary and save
    await showConfigurationAndSave();

  } catch (error) {
    console.error(chalk.red('Error during configuration:'), error.message);
    process.exit(1);
  }
}

async function addProjectsManually() {
  while (true) {
    const name = await promptInput('Enter project name (or press Enter to finish): ');
    if (!name || name.trim().length === 0) {
      break;
    }

    const projectName = name.trim();
    const projectPath = await promptWithTabCompletion(`Enter path for project "${projectName}" (relative to ${config.root}): `, projectName);
    const description = await promptInput(`Enter description for "${projectName}" (optional): `, `Project: ${projectName}`);

    config.projects.push({
      name: projectName,
      path: projectPath.trim(),
      description: description.trim()
    });
    config.environments.default.projects.push(projectName);

    console.log(chalk.green(`✓ Added project: ${projectName}\n`));
  }
}

async function configureEnvironments() {
  const addEnvironments = await promptYesNo('Would you like to configure additional environments?', false);
  if (!addEnvironments) {
    return;
  }

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