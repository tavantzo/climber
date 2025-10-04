const chalk = require('chalk');
const path = require('path');

/**
 * Standard hook names that can be used across the application
 */
const STANDARD_HOOKS = {
  // Dependency management hooks
  INSTALL_DEPS: 'install-deps',
  UPDATE_DEPS: 'update-deps',
  CLEAN_DEPS: 'clean-deps',
  
  // Build hooks
  BUILD: 'build',
  REBUILD: 'rebuild',
  CLEAN_BUILD: 'clean-build',
  
  // Test hooks
  TEST: 'test',
  TEST_UNIT: 'test-unit',
  TEST_INTEGRATION: 'test-integration',
  
  // Lint hooks
  LINT: 'lint',
  LINT_FIX: 'lint-fix',
  
  // VCS hooks
  VCS_STATUS: 'vcs-status',
  VCS_PULL: 'vcs-pull',
  VCS_PUSH: 'vcs-push',
  VCS_SYNC: 'vcs-sync',
  
  // Service lifecycle hooks
  PRE_START: 'pre-start',
  POST_START: 'post-start',
  PRE_STOP: 'pre-stop',
  POST_STOP: 'post-stop',
  
  // Database hooks
  DB_MIGRATE: 'db-migrate',
  DB_SEED: 'db-seed',
  DB_RESET: 'db-reset'
};

/**
 * Get the hook command for a project
 * @param {Object} project - Project configuration
 * @param {string} hookName - Name of the hook (e.g., 'install-deps')
 * @param {Object} config - Full configuration with hooks
 * @returns {Object|null} - Hook command configuration or null if not found
 */
function getHook(project, hookName, config) {
  // First check project-specific hooks
  if (project.hooks && project.hooks[hookName]) {
    return {
      ...project.hooks[hookName],
      name: hookName,
      source: 'project'
    };
  }
  
  // Then check global hooks
  if (config.hooks && config.hooks[hookName]) {
    return {
      ...config.hooks[hookName],
      name: hookName,
      source: 'global'
    };
  }
  
  // Finally check if there's a custom command with the same name
  if (config.customCommands && config.customCommands[hookName]) {
    return {
      ...config.customCommands[hookName],
      name: hookName,
      source: 'custom-command'
    };
  }
  
  return null;
}

/**
 * Check if a hook exists for a project
 * @param {Object} project - Project configuration
 * @param {string} hookName - Name of the hook
 * @param {Object} config - Full configuration
 * @returns {boolean} - True if hook exists
 */
function hasHook(project, hookName, config) {
  return getHook(project, hookName, config) !== null;
}

/**
 * Execute a hook for a project
 * @param {Object} project - Project configuration
 * @param {string} hookName - Name of the hook
 * @param {Object} config - Full configuration
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} - Hook execution result
 */
async function executeHook(project, hookName, config, options = {}) {
  const hook = getHook(project, hookName, config);
  
  if (!hook) {
    return {
      success: true,
      skipped: true,
      project: project.name,
      hook: hookName,
      message: `No hook defined for '${hookName}'`
    };
  }
  
  console.log(chalk.blue(`🪝 Executing hook '${hookName}' for ${project.name}...`));
  if (hook.description) {
    console.log(chalk.gray(`   ${hook.description}`));
  }
  console.log(chalk.gray(`   Source: ${hook.source}`));
  
  // Import custom-commands module to reuse execution logic
  const { executeCustomCommand } = require('./custom-commands');
  const projectPath = path.join(config.root, project.path);
  
  try {
    const result = await executeCustomCommand(project, projectPath, hook, options);
    return {
      ...result,
      hook: hookName,
      source: hook.source
    };
  } catch (error) {
    return {
      success: false,
      project: project.name,
      hook: hookName,
      source: hook.source,
      error: error.message
    };
  }
}

/**
 * Execute a hook for multiple projects
 * @param {Array} projects - Array of project configurations
 * @param {string} hookName - Name of the hook
 * @param {Object} config - Full configuration
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} - Execution results
 */
async function executeHookForProjects(projects, hookName, config, options = {}) {
  const { parallel = false, continueOnError = true } = options;
  
  // Filter projects that have the hook
  const projectsWithHook = projects.filter(project => hasHook(project, hookName, config));
  
  if (projectsWithHook.length === 0) {
    console.log(chalk.yellow(`No projects have the '${hookName}' hook configured.`));
    return { success: true, results: [] };
  }
  
  console.log(chalk.blue(`🚀 Executing hook '${hookName}' on ${projectsWithHook.length} project(s)...`));
  console.log(chalk.cyan(`📋 Target projects: ${projectsWithHook.map(p => p.name).join(', ')}\n`));
  
  const results = [];
  
  if (parallel) {
    // Execute hooks in parallel
    const promises = projectsWithHook.map(async (project) => {
      try {
        return await executeHook(project, hookName, config, options);
      } catch (error) {
        return {
          success: false,
          project: project.name,
          hook: hookName,
          error: error.message
        };
      }
    });
    
    const parallelResults = await Promise.all(promises);
    results.push(...parallelResults);
  } else {
    // Execute hooks sequentially
    for (const project of projectsWithHook) {
      try {
        const result = await executeHook(project, hookName, config, options);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          project: project.name,
          hook: hookName,
          error: error.message
        });
        
        if (!continueOnError) {
          throw error;
        }
      }
    }
  }
  
  const successCount = results.filter(r => r.success && !r.skipped).length;
  const skippedCount = results.filter(r => r.skipped).length;
  const failureCount = results.length - successCount - skippedCount;
  
  console.log(chalk.blue(`\n📊 Hook Execution Summary:`));
  console.log(chalk.green(`✓ Successful: ${successCount}`));
  if (skippedCount > 0) {
    console.log(chalk.gray(`⊘ Skipped: ${skippedCount}`));
  }
  if (failureCount > 0) {
    console.log(chalk.red(`✗ Failed: ${failureCount}`));
  }
  
  return {
    success: failureCount === 0,
    hook: hookName,
    results
  };
}

/**
 * List all available hooks in the configuration
 * @param {Object} config - Full configuration
 * @returns {void}
 */
function listHooks(config) {
  const globalHooks = config.hooks || {};
  const customCommands = config.customCommands || {};
  
  console.log(chalk.blue('🪝 Available Hooks:\n'));
  
  // List standard hooks
  console.log(chalk.cyan('Standard Hooks:'));
  console.log(chalk.gray('  These are predefined hook names you can use:\n'));
  Object.entries(STANDARD_HOOKS).forEach(([key, hookName]) => {
    console.log(chalk.gray(`  ${hookName.padEnd(20)} (${key})`));
  });
  console.log('');
  
  // List configured global hooks
  if (Object.keys(globalHooks).length > 0) {
    console.log(chalk.cyan('Configured Global Hooks:'));
    console.log(chalk.gray('  These hooks apply to all projects unless overridden:\n'));
    Object.entries(globalHooks).forEach(([name, hook]) => {
      console.log(chalk.cyan(`  ${name}`));
      if (hook.description) {
        console.log(chalk.gray(`    ${hook.description}`));
      }
      console.log(chalk.gray(`    Command: ${hook.command}`));
      console.log('');
    });
  }
  
  // List custom commands that can be used as hooks
  if (Object.keys(customCommands).length > 0) {
    console.log(chalk.cyan('Custom Commands (usable as hooks):'));
    console.log(chalk.gray('  Custom commands can be referenced as hooks:\n'));
    Object.entries(customCommands).forEach(([name, command]) => {
      console.log(chalk.cyan(`  ${name}`));
      if (command.description) {
        console.log(chalk.gray(`    ${command.description}`));
      }
      console.log('');
    });
  }
  
  // List project-specific hooks
  const projects = config.projects || [];
  const projectsWithHooks = projects.filter(p => p.hooks && Object.keys(p.hooks).length > 0);
  
  if (projectsWithHooks.length > 0) {
    console.log(chalk.cyan('Project-Specific Hooks:'));
    console.log(chalk.gray('  These hooks override global hooks for specific projects:\n'));
    projectsWithHooks.forEach(project => {
      console.log(chalk.cyan(`  ${project.name}:`));
      Object.entries(project.hooks).forEach(([name, hook]) => {
        console.log(chalk.gray(`    ${name}: ${hook.command}`));
      });
      console.log('');
    });
  }
}

module.exports = {
  STANDARD_HOOKS,
  getHook,
  hasHook,
  executeHook,
  executeHookForProjects,
  listHooks
};

