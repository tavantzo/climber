#!/usr/bin/env node

const chalk = require('chalk');
const inquirer = require('inquirer');
const configManager = require('./config');
const {
  executeGitOperation,
  getRepositoryInfo,
  isGitRepository,
  getGitRoot
} = require('./vcs');

/**
 * Parse command-line arguments
 * @returns {Object} - Parsed arguments
 */
function parseArguments() {
  const args = process.argv.slice(2);
  
  const options = {
    operation: null,
    projects: [],
    force: false,
    rebase: false,
    parallel: false,
    interactive: false,
    list: false,
    help: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--force' || arg === '-f') {
      options.force = true;
    } else if (arg === '--rebase' || arg === '-r') {
      options.rebase = true;
    } else if (arg === '--parallel' || arg === '-p') {
      options.parallel = true;
    } else if (arg === '--interactive' || arg === '-i') {
      options.interactive = true;
    } else if (arg === '--list' || arg === '-l') {
      options.list = true;
    } else if (!options.operation && !arg.startsWith('-')) {
      options.operation = arg;
    } else if (!arg.startsWith('-')) {
      options.projects.push(arg);
    }
  }
  
  return options;
}

/**
 * Show help message
 */
function showHelp() {
  console.log(chalk.blue('Mountain Climber - Git Operations'));
  console.log('');
  console.log(chalk.cyan('Usage:'));
  console.log('  climb git <operation> [projects...] [options]');
  console.log('');
  console.log(chalk.cyan('Operations:'));
  console.log('  status      Show git status for projects');
  console.log('  pull        Pull changes from remote (only if safe)');
  console.log('  sync        Fetch and pull if no conflicts');
  console.log('  root        Show git repository root for projects');
  console.log('');
  console.log(chalk.cyan('Options:'));
  console.log('  --force, -f         Force operation (stash changes if needed)');
  console.log('  --rebase, -r        Use rebase when pulling');
  console.log('  --parallel, -p      Execute in parallel (status and sync only)');
  console.log('  --interactive, -i   Interactive project selection');
  console.log('  --list, -l          List all projects with git repositories');
  console.log('  --help, -h          Show this help message');
  console.log('');
  console.log(chalk.cyan('Examples:'));
  console.log('  climb git status                    # Show status for all projects');
  console.log('  climb git status api frontend       # Show status for specific projects');
  console.log('  climb git pull                      # Pull changes for all projects (safe)');
  console.log('  climb git pull --rebase             # Pull with rebase');
  console.log('  climb git sync                      # Fetch and pull if safe');
  console.log('  climb git sync --parallel           # Sync all projects in parallel');
  console.log('  climb git root database             # Show git root for database project');
  console.log('  climb git --list                    # List all git repositories');
  console.log('');
  console.log(chalk.cyan('Safety Features:'));
  console.log('  • Won\'t pull if there are uncommitted changes');
  console.log('  • Won\'t pull if local commits would create a merge');
  console.log('  • Sync operation fetches first and only pulls if fast-forward');
  console.log('  • Use --force and --rebase flags for more control');
}

/**
 * List all projects with git repositories
 * @param {Object} config - Full configuration
 */
function listGitRepositories(config) {
  const projects = config.projects || [];
  const gitProjects = [];
  
  console.log(chalk.blue('📋 Scanning for git repositories...\n'));
  
  projects.forEach(project => {
    const projectPath = require('path').join(config.root, project.path);
    if (isGitRepository(projectPath)) {
      const gitRoot = getGitRoot(projectPath);
      gitProjects.push({
        project,
        gitRoot
      });
    }
  });
  
  if (gitProjects.length === 0) {
    console.log(chalk.yellow('No git repositories found.'));
    return;
  }
  
  console.log(chalk.cyan(`Found ${gitProjects.length} git repositories:\n`));
  gitProjects.forEach(({ project, gitRoot }) => {
    console.log(chalk.green(`✓ ${project.name}`));
    if (project.description) {
      console.log(chalk.gray(`  ${project.description}`));
    }
    console.log(chalk.gray(`  Path: ${project.path}`));
    console.log(chalk.gray(`  Git Root: ${gitRoot}`));
    console.log('');
  });
}

/**
 * Show git root for projects
 * @param {Array} projects - Array of projects
 * @param {Object} config - Full configuration
 */
function showGitRoots(projects, config) {
  console.log(chalk.blue('📁 Git Repository Roots:\n'));
  
  projects.forEach(project => {
    const projectPath = require('path').join(config.root, project.path);
    const info = getRepositoryInfo(project, projectPath);
    
    console.log(chalk.cyan(`${project.name}:`));
    if (!info.isGitRepo) {
      console.log(chalk.yellow(`  ⚠ Not a git repository`));
    } else {
      console.log(chalk.green(`  Git Root: ${info.gitRoot}`));
      console.log(chalk.gray(`  Branch: ${info.branch}`));
    }
    console.log('');
  });
}

/**
 * Select projects interactively
 * @param {Object} config - Full configuration
 * @returns {Promise<Array>} - Selected projects
 */
async function selectProjects(config) {
  const projects = config.projects || [];
  
  // Filter to only git repositories
  const gitProjects = projects.filter(project => {
    const projectPath = require('path').join(config.root, project.path);
    return isGitRepository(projectPath);
  });
  
  if (gitProjects.length === 0) {
    console.log(chalk.yellow('No git repositories found.'));
    return [];
  }
  
  const choices = gitProjects.map(project => ({
    name: `${project.name}${project.description ? ` - ${project.description}` : ''}`,
    value: project,
    checked: true
  }));
  
  const { selectedProjects } = await inquirer['prompt']([{
    type: 'checkbox',
    name: 'selectedProjects',
    message: 'Select projects:',
    choices: choices
  }]);
  
  return selectedProjects;
}

/**
 * Main execution function
 */
async function main() {
  try {
    const { operation, projects: projectNames, ...options } = parseArguments();
    
    // Show help if requested
    if (options.help || (!operation && !options.list)) {
      showHelp();
      return;
    }
    
    // Load configuration
    configManager.load();
    const config = configManager.config;
    
    // List repositories if requested
    if (options.list) {
      listGitRepositories(config);
      return;
    }
    
    // Validate operation
    const validOperations = ['status', 'pull', 'sync', 'root'];
    if (!validOperations.includes(operation)) {
      console.error(chalk.red(`Invalid operation: ${operation}`));
      console.log(chalk.yellow('Valid operations: status, pull, sync, root'));
      console.log(chalk.gray('Run "climb git --help" for more information'));
      process.exit(1);
    }
    
    // Get projects to operate on
    let selectedProjects;
    
    if (options.interactive) {
      selectedProjects = await selectProjects(config);
      if (selectedProjects.length === 0) {
        return;
      }
    } else if (projectNames.length > 0) {
      // Filter by provided project names
      const allProjects = config.projects || [];
      selectedProjects = allProjects.filter(p => projectNames.includes(p.name));
      
      if (selectedProjects.length === 0) {
        console.error(chalk.red('No matching projects found'));
        process.exit(1);
      }
    } else {
      // Use all projects
      const allProjects = config.projects || [];
      // Filter to only git repositories
      selectedProjects = allProjects.filter(project => {
        const projectPath = require('path').join(config.root, project.path);
        return isGitRepository(projectPath);
      });
      
      if (selectedProjects.length === 0) {
        console.log(chalk.yellow('No git repositories found in configured projects.'));
        return;
      }
    }
    
    // Handle 'root' operation separately
    if (operation === 'root') {
      showGitRoots(selectedProjects, config);
      return;
    }
    
    // Execute the git operation
    await executeGitOperation(selectedProjects, operation, config, options);
    
  } catch (error) {
    console.error(chalk.red('Error executing git operation:'), error.message);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { main };

