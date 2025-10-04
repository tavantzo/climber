const { spawn, execSync } = require('child_process');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

/**
 * Check if a directory is a git repository
 * @param {string} directory - Directory path
 * @returns {boolean} - True if it's a git repository
 */
function isGitRepository(directory) {
  try {
    execSync('git rev-parse --git-dir', {
      cwd: directory,
      stdio: 'ignore'
    });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get the root directory of a git repository
 * @param {string} directory - Any directory within the repository
 * @returns {string|null} - Root directory path or null if not in a git repository
 */
function getGitRoot(directory) {
  try {
    const root = execSync('git rev-parse --show-toplevel', {
      cwd: directory,
      encoding: 'utf8'
    });
    return root.trim();
  } catch (error) {
    return null;
  }
}

/**
 * Get the current branch name
 * @param {string} directory - Repository directory
 * @returns {string|null} - Branch name or null if not in a git repository
 */
function getCurrentBranch(directory) {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: directory,
      encoding: 'utf8'
    });
    return branch.trim();
  } catch (error) {
    return null;
  }
}

/**
 * Check if there are uncommitted changes
 * @param {string} directory - Repository directory
 * @returns {boolean} - True if there are uncommitted changes
 */
function hasUncommittedChanges(directory) {
  try {
    const status = execSync('git status --porcelain', {
      cwd: directory,
      encoding: 'utf8'
    });
    return status.trim().length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Check if local branch is behind remote
 * @param {string} directory - Repository directory
 * @returns {Object} - Status object with behind, ahead, and upToDate properties
 */
function getRemoteStatus(directory) {
  try {
    // Fetch remote info without pulling
    execSync('git fetch --dry-run', {
      cwd: directory,
      stdio: 'ignore'
    });
    
    const branch = getCurrentBranch(directory);
    if (!branch) {
      return { error: 'Could not determine current branch' };
    }
    
    // Check if remote branch exists
    try {
      execSync(`git rev-parse --verify origin/${branch}`, {
        cwd: directory,
        stdio: 'ignore'
      });
    } catch (error) {
      return { noRemote: true, branch };
    }
    
    // Get ahead/behind counts
    const counts = execSync(`git rev-list --left-right --count origin/${branch}...HEAD`, {
      cwd: directory,
      encoding: 'utf8'
    });
    
    const [behind, ahead] = counts.trim().split('\t').map(Number);
    
    return {
      branch,
      behind,
      ahead,
      upToDate: behind === 0 && ahead === 0,
      canFastForward: behind > 0 && ahead === 0
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Execute git status for a project
 * @param {Object} project - Project configuration
 * @param {string} projectPath - Full path to project directory
 * @returns {Promise<Object>} - Status result
 */
async function gitStatus(project, projectPath) {
  console.log(chalk.blue(`📊 Git status for ${project.name}...`));
  
  if (!isGitRepository(projectPath)) {
    console.log(chalk.yellow(`   ⚠ Not a git repository`));
    return {
      success: true,
      project: project.name,
      isGitRepo: false
    };
  }
  
  const branch = getCurrentBranch(projectPath);
  const hasChanges = hasUncommittedChanges(projectPath);
  const remoteStatus = getRemoteStatus(projectPath);
  
  console.log(chalk.cyan(`   Branch: ${branch}`));
  
  if (hasChanges) {
    console.log(chalk.yellow(`   ⚠ Uncommitted changes detected`));
  } else {
    console.log(chalk.green(`   ✓ Working directory clean`));
  }
  
  if (remoteStatus.noRemote) {
    console.log(chalk.gray(`   ℹ No remote branch configured`));
  } else if (remoteStatus.error) {
    console.log(chalk.red(`   ✗ Error checking remote: ${remoteStatus.error}`));
  } else {
    if (remoteStatus.upToDate) {
      console.log(chalk.green(`   ✓ Up to date with origin/${branch}`));
    } else {
      if (remoteStatus.behind > 0) {
        console.log(chalk.yellow(`   ⬇ ${remoteStatus.behind} commit(s) behind origin/${branch}`));
      }
      if (remoteStatus.ahead > 0) {
        console.log(chalk.yellow(`   ⬆ ${remoteStatus.ahead} commit(s) ahead of origin/${branch}`));
      }
    }
  }
  
  return {
    success: true,
    project: project.name,
    isGitRepo: true,
    branch,
    hasChanges,
    remoteStatus
  };
}

/**
 * Execute git pull for a project
 * @param {Object} project - Project configuration
 * @param {string} projectPath - Full path to project directory
 * @param {Object} options - Pull options
 * @returns {Promise<Object>} - Pull result
 */
async function gitPull(project, projectPath, options = {}) {
  const { force = false, rebase = false } = options;
  
  console.log(chalk.blue(`⬇ Pulling changes for ${project.name}...`));
  
  if (!isGitRepository(projectPath)) {
    console.log(chalk.yellow(`   ⚠ Not a git repository - skipping`));
    return {
      success: true,
      skipped: true,
      project: project.name,
      isGitRepo: false
    };
  }
  
  const hasChanges = hasUncommittedChanges(projectPath);
  const remoteStatus = getRemoteStatus(projectPath);
  
  // Check if pull is needed
  if (remoteStatus.upToDate) {
    console.log(chalk.green(`   ✓ Already up to date`));
    return {
      success: true,
      project: project.name,
      upToDate: true
    };
  }
  
  // Check for uncommitted changes
  if (hasChanges && !force) {
    console.log(chalk.red(`   ✗ Cannot pull: uncommitted changes detected`));
    console.log(chalk.yellow(`   💡 Commit your changes or use --force to stash and pull`));
    return {
      success: false,
      project: project.name,
      error: 'Uncommitted changes detected'
    };
  }
  
  // Check if there are local commits that would create a merge
  if (remoteStatus.ahead > 0 && !rebase && !force) {
    console.log(chalk.red(`   ✗ Cannot pull: local commits would create a merge`));
    console.log(chalk.yellow(`   💡 Use --rebase to rebase local commits or push your changes first`));
    return {
      success: false,
      project: project.name,
      error: 'Local commits detected - would create merge'
    };
  }
  
  return new Promise((resolve) => {
    const args = ['pull'];
    if (rebase) {
      args.push('--rebase');
    }
    
    const child = spawn('git', args, {
      cwd: projectPath,
      stdio: 'inherit'
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(chalk.green(`   ✓ Successfully pulled changes for ${project.name}`));
        resolve({
          success: true,
          project: project.name
        });
      } else {
        console.error(chalk.red(`   ✗ Failed to pull changes for ${project.name}`));
        resolve({
          success: false,
          project: project.name,
          error: `Git pull failed with exit code ${code}`
        });
      }
    });
    
    child.on('error', (error) => {
      console.error(chalk.red(`   ✗ Error pulling ${project.name}:`), error.message);
      resolve({
        success: false,
        project: project.name,
        error: error.message
      });
    });
  });
}

/**
 * Execute git sync (fetch + pull if safe) for a project
 * @param {Object} project - Project configuration
 * @param {string} projectPath - Full path to project directory
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} - Sync result
 */
async function gitSync(project, projectPath, options = {}) {
  console.log(chalk.blue(`🔄 Syncing ${project.name} with remote...`));
  
  if (!isGitRepository(projectPath)) {
    console.log(chalk.yellow(`   ⚠ Not a git repository - skipping`));
    return {
      success: true,
      skipped: true,
      project: project.name,
      isGitRepo: false
    };
  }
  
  // First fetch to get latest remote info
  try {
    execSync('git fetch', {
      cwd: projectPath,
      stdio: 'inherit'
    });
    console.log(chalk.green(`   ✓ Fetched latest remote information`));
  } catch (error) {
    console.error(chalk.red(`   ✗ Failed to fetch remote information`));
    return {
      success: false,
      project: project.name,
      error: 'Git fetch failed'
    };
  }
  
  // Check status and pull if safe
  const remoteStatus = getRemoteStatus(projectPath);
  const hasChanges = hasUncommittedChanges(projectPath);
  
  if (hasChanges) {
    console.log(chalk.yellow(`   ⚠ Uncommitted changes detected - skipping pull`));
    return {
      success: true,
      project: project.name,
      fetched: true,
      pulled: false,
      reason: 'Uncommitted changes'
    };
  }
  
  if (remoteStatus.canFastForward) {
    console.log(chalk.cyan(`   ⬇ Pulling changes (fast-forward)...`));
    return await gitPull(project, projectPath, options);
  } else if (remoteStatus.ahead > 0) {
    console.log(chalk.yellow(`   ⚠ Local commits detected - skipping pull`));
    console.log(chalk.gray(`   💡 Push your changes or use 'climb git pull --rebase'`));
    return {
      success: true,
      project: project.name,
      fetched: true,
      pulled: false,
      reason: 'Local commits detected'
    };
  } else if (remoteStatus.upToDate) {
    console.log(chalk.green(`   ✓ Already up to date`));
    return {
      success: true,
      project: project.name,
      fetched: true,
      upToDate: true
    };
  }
  
  return {
    success: true,
    project: project.name,
    fetched: true
  };
}

/**
 * Open repository in terminal (change to git root)
 * @param {Object} project - Project configuration
 * @param {string} projectPath - Full path to project directory
 * @returns {Object} - Repository info
 */
function getRepositoryInfo(project, projectPath) {
  if (!isGitRepository(projectPath)) {
    return {
      success: false,
      project: project.name,
      isGitRepo: false,
      error: 'Not a git repository'
    };
  }
  
  const gitRoot = getGitRoot(projectPath);
  const branch = getCurrentBranch(projectPath);
  const hasChanges = hasUncommittedChanges(projectPath);
  const remoteStatus = getRemoteStatus(projectPath);
  
  return {
    success: true,
    project: project.name,
    isGitRepo: true,
    gitRoot,
    branch,
    hasChanges,
    remoteStatus,
    projectPath
  };
}

/**
 * Execute git operation for multiple projects
 * @param {Array} projects - Array of project configurations
 * @param {string} operation - Operation name (status, pull, sync)
 * @param {Object} config - Full configuration
 * @param {Object} options - Operation options
 * @returns {Promise<Object>} - Operation results
 */
async function executeGitOperation(projects, operation, config, options = {}) {
  const { parallel = false } = options;
  
  console.log(chalk.blue(`🚀 Executing git ${operation} on ${projects.length} project(s)...`));
  console.log(chalk.cyan(`📋 Target projects: ${projects.map(p => p.name).join(', ')}\n`));
  
  const results = [];
  
  const operationMap = {
    status: gitStatus,
    pull: gitPull,
    sync: gitSync
  };
  
  const operationFunc = operationMap[operation];
  if (!operationFunc) {
    throw new Error(`Unknown git operation: ${operation}`);
  }
  
  if (parallel && operation !== 'pull') {
    // Execute in parallel (but not for pull to avoid conflicts)
    const promises = projects.map(async (project) => {
      const projectPath = path.join(config.root, project.path);
      try {
        return await operationFunc(project, projectPath, options);
      } catch (error) {
        return {
          success: false,
          project: project.name,
          error: error.message
        };
      }
    });
    
    const parallelResults = await Promise.all(promises);
    results.push(...parallelResults);
  } else {
    // Execute sequentially
    for (const project of projects) {
      const projectPath = path.join(config.root, project.path);
      try {
        const result = await operationFunc(project, projectPath, options);
        results.push(result);
        // Add a small delay between operations
        if (projects.indexOf(project) < projects.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        results.push({
          success: false,
          project: project.name,
          error: error.message
        });
      }
      console.log(''); // Add spacing between projects
    }
  }
  
  const successCount = results.filter(r => r.success && !r.skipped).length;
  const skippedCount = results.filter(r => r.skipped).length;
  const failureCount = results.length - successCount - skippedCount;
  
  console.log(chalk.blue(`📊 Git ${operation} Summary:`));
  console.log(chalk.green(`✓ Successful: ${successCount}`));
  if (skippedCount > 0) {
    console.log(chalk.gray(`⊘ Skipped: ${skippedCount}`));
  }
  if (failureCount > 0) {
    console.log(chalk.red(`✗ Failed: ${failureCount}`));
  }
  
  return {
    success: failureCount === 0,
    operation,
    results
  };
}

module.exports = {
  isGitRepository,
  getGitRoot,
  getCurrentBranch,
  hasUncommittedChanges,
  getRemoteStatus,
  gitStatus,
  gitPull,
  gitSync,
  getRepositoryInfo,
  executeGitOperation
};

