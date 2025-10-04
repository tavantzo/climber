/**
 * @climber/core
 * 
 * Core CLI functionality for Mountain Climber
 * This module exports all the main functions that can be used by other packages
 */

// Configuration management
const configManager = require('./bin/config');

// Hooks system
const hooks = require('./bin/hooks');

// VCS/Git operations
const vcs = require('./bin/vcs');

// Custom commands
const customCommands = require('./bin/custom-commands');

// Dependency readiness
const dependencyReadiness = require('./bin/dependency-readiness');

// Folders/Projects
const folders = require('./bin/folders');

// Export all modules
module.exports = {
  // Config
  ConfigManager: configManager.constructor,
  configManager,
  
  // Hooks
  hooks,
  executeHook: hooks.executeHook,
  executeHookForProjects: hooks.executeHookForProjects,
  getHook: hooks.getHook,
  hasHook: hooks.hasHook,
  listHooks: hooks.listHooks,
  STANDARD_HOOKS: hooks.STANDARD_HOOKS,
  
  // VCS/Git
  vcs,
  isGitRepository: vcs.isGitRepository,
  getGitRoot: vcs.getGitRoot,
  getCurrentBranch: vcs.getCurrentBranch,
  hasUncommittedChanges: vcs.hasUncommittedChanges,
  getRemoteStatus: vcs.getRemoteStatus,
  gitStatus: vcs.gitStatus,
  gitPull: vcs.gitPull,
  gitSync: vcs.gitSync,
  getRepositoryInfo: vcs.getRepositoryInfo,
  executeGitOperation: vcs.executeGitOperation,
  
  // Custom Commands
  customCommands,
  executeCustomCommand: customCommands.executeCustomCommand,
  executeCustomCommands: customCommands.executeCustomCommands,
  getTargetProjects: customCommands.getTargetProjects,
  listCustomCommands: customCommands.listCustomCommands,
  
  // Dependency Readiness
  dependencyReadiness,
  checkDependencyReadiness: dependencyReadiness.checkDependencyReadiness,
  waitForDependencies: dependencyReadiness.waitForDependencies,
  getDependencyReadinessConfig: dependencyReadiness.getDependencyReadinessConfig,
  
  // Folders/Projects
  folders,
  getProjects: folders.getProjects
};

