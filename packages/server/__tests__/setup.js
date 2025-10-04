// Test setup and utilities

// Mock @climber/core module
const mockConfigManager = {
  load: jest.fn(),
  config: {
    root: '/test/root',
    projects: [
      {
        name: 'test-project-1',
        path: 'project1',
        description: 'Test project 1'
      },
      {
        name: 'test-project-2',
        path: 'project2',
        description: 'Test project 2',
        hooks: {
          'test': {
            command: 'npm test'
          }
        }
      }
    ],
    hooks: {
      'install-deps': {
        command: 'npm install',
        description: 'Install dependencies'
      }
    },
    customCommands: {
      'bundle-install': {
        command: 'bundle install',
        description: 'Install gems'
      }
    }
  },
  currentWorkspace: 'default',
  getCurrentWorkspace: jest.fn(() => 'default'),
  listWorkspaces: jest.fn(() => ['default', 'test-workspace']),
  switchWorkspace: jest.fn()
};

const mockFolders = {
  getProjects: jest.fn(() => mockConfigManager.config.projects)
};

const mockExecuteHookForProjects = jest.fn(async () => ({
  success: true,
  hook: 'test-hook',
  results: []
}));

const mockExecuteGitOperation = jest.fn(async () => ({
  success: true,
  operation: 'status',
  results: []
}));

const mockStandardHooks = {
  INSTALL_DEPS: 'install-deps',
  TEST: 'test',
  LINT: 'lint'
};

jest.mock('@climber/core', () => ({
  configManager: mockConfigManager,
  folders: mockFolders,
  executeHookForProjects: mockExecuteHookForProjects,
  executeGitOperation: mockExecuteGitOperation,
  listHooks: jest.fn(),
  STANDARD_HOOKS: mockStandardHooks
}));

// Mock docker-compose
const mockDcPs = jest.fn();
const mockDcUpAll = jest.fn();
const mockDcDown = jest.fn();
const mockDcRestartAll = jest.fn();
const mockDcLogs = jest.fn();

jest.mock('docker-compose', () => ({
  ps: mockDcPs,
  upAll: mockDcUpAll,
  down: mockDcDown,
  restartAll: mockDcRestartAll,
  logs: mockDcLogs
}));

// Export mocks for use in tests
module.exports = {
  mockConfigManager,
  mockFolders,
  mockExecuteHookForProjects,
  mockExecuteGitOperation,
  mockStandardHooks,
  mockDcPs,
  mockDcUpAll,
  mockDcDown,
  mockDcRestartAll,
  mockDcLogs
};

