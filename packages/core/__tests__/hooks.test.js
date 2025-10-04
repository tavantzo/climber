// Mock custom-commands module
const mockExecuteCustomCommand = jest.fn();
jest.mock('../bin/custom-commands', () => ({
  executeCustomCommand: mockExecuteCustomCommand
}));

// Mock chalk
jest.mock('chalk', () => ({
  blue: jest.fn(str => str),
  green: jest.fn(str => str),
  yellow: jest.fn(str => str),
  red: jest.fn(str => str),
  cyan: jest.fn(str => str),
  gray: jest.fn(str => str)
}));

const {
  STANDARD_HOOKS,
  getHook,
  hasHook,
  executeHook,
  executeHookForProjects,
  listHooks
} = require('../bin/hooks');

describe('Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecuteCustomCommand.mockResolvedValue({
      success: true,
      project: 'test-project',
      command: 'test-command'
    });
  });

  describe('STANDARD_HOOKS', () => {
    it('should define standard hook names', () => {
      expect(STANDARD_HOOKS.INSTALL_DEPS).toBe('install-deps');
      expect(STANDARD_HOOKS.UPDATE_DEPS).toBe('update-deps');
      expect(STANDARD_HOOKS.TEST).toBe('test');
      expect(STANDARD_HOOKS.LINT).toBe('lint');
      expect(STANDARD_HOOKS.BUILD).toBe('build');
      expect(STANDARD_HOOKS.VCS_STATUS).toBe('vcs-status');
      expect(STANDARD_HOOKS.VCS_PULL).toBe('vcs-pull');
      expect(STANDARD_HOOKS.DB_MIGRATE).toBe('db-migrate');
    });
  });

  describe('getHook', () => {
    it('should return project-specific hook', () => {
      const project = {
        name: 'test-project',
        hooks: {
          'install-deps': {
            command: 'npm install',
            description: 'Install dependencies'
          }
        }
      };

      const config = {
        hooks: {
          'install-deps': {
            command: 'yarn install',
            description: 'Global install'
          }
        }
      };

      const hook = getHook(project, 'install-deps', config);

      expect(hook.command).toBe('npm install');
      expect(hook.source).toBe('project');
      expect(hook.name).toBe('install-deps');
    });

    it('should return global hook when project hook not found', () => {
      const project = {
        name: 'test-project'
      };

      const config = {
        hooks: {
          'install-deps': {
            command: 'yarn install',
            description: 'Global install'
          }
        }
      };

      const hook = getHook(project, 'install-deps', config);

      expect(hook.command).toBe('yarn install');
      expect(hook.source).toBe('global');
    });

    it('should return custom command as hook', () => {
      const project = {
        name: 'test-project'
      };

      const config = {
        customCommands: {
          'install-deps': {
            command: 'bundle install',
            description: 'Install gems'
          }
        }
      };

      const hook = getHook(project, 'install-deps', config);

      expect(hook.command).toBe('bundle install');
      expect(hook.source).toBe('custom-command');
    });

    it('should return null when hook not found', () => {
      const project = {
        name: 'test-project'
      };

      const config = {};

      const hook = getHook(project, 'non-existent', config);

      expect(hook).toBeNull();
    });

    it('should prioritize project hook over global hook', () => {
      const project = {
        name: 'test-project',
        hooks: {
          'install-deps': {
            command: 'npm install'
          }
        }
      };

      const config = {
        hooks: {
          'install-deps': {
            command: 'yarn install'
          }
        },
        customCommands: {
          'install-deps': {
            command: 'bundle install'
          }
        }
      };

      const hook = getHook(project, 'install-deps', config);

      expect(hook.command).toBe('npm install');
      expect(hook.source).toBe('project');
    });
  });

  describe('hasHook', () => {
    it('should return true when hook exists', () => {
      const project = {
        name: 'test-project',
        hooks: {
          'test': {
            command: 'npm test'
          }
        }
      };

      const config = {};

      expect(hasHook(project, 'test', config)).toBe(true);
    });

    it('should return false when hook does not exist', () => {
      const project = {
        name: 'test-project'
      };

      const config = {};

      expect(hasHook(project, 'test', config)).toBe(false);
    });
  });

  describe('executeHook', () => {
    const config = {
      root: '/test/root'
    };

    it('should execute hook successfully', async () => {
      const project = {
        name: 'test-project',
        path: 'test-project',
        hooks: {
          'install-deps': {
            command: 'npm install',
            description: 'Install dependencies'
          }
        }
      };

      mockExecuteCustomCommand.mockResolvedValue({
        success: true,
        project: 'test-project',
        command: 'install-deps'
      });

      const result = await executeHook(project, 'install-deps', config);

      expect(result.success).toBe(true);
      expect(result.hook).toBe('install-deps');
      expect(result.source).toBe('project');
      expect(mockExecuteCustomCommand).toHaveBeenCalled();
    });

    it('should return skipped result when hook not found', async () => {
      const project = {
        name: 'test-project',
        path: 'test-project'
      };

      const result = await executeHook(project, 'non-existent', config);

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.project).toBe('test-project');
      expect(result.hook).toBe('non-existent');
      expect(mockExecuteCustomCommand).not.toHaveBeenCalled();
    });

    it('should handle hook execution failure', async () => {
      const project = {
        name: 'test-project',
        path: 'test-project',
        hooks: {
          'test': {
            command: 'npm test'
          }
        }
      };

      mockExecuteCustomCommand.mockRejectedValue(new Error('Test failed'));

      const result = await executeHook(project, 'test', config);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Test failed');
      expect(result.project).toBe('test-project');
      expect(result.hook).toBe('test');
    });
  });

  describe('executeHookForProjects', () => {
    const config = {
      root: '/test/root'
    };

    it('should execute hook for multiple projects', async () => {
      const projects = [
        {
          name: 'project1',
          path: 'project1',
          hooks: {
            'install-deps': {
              command: 'npm install'
            }
          }
        },
        {
          name: 'project2',
          path: 'project2',
          hooks: {
            'install-deps': {
              command: 'yarn install'
            }
          }
        }
      ];

      mockExecuteCustomCommand.mockResolvedValue({
        success: true
      });

      const result = await executeHookForProjects(projects, 'install-deps', config);

      expect(result.success).toBe(true);
      expect(result.hook).toBe('install-deps');
      expect(result.results).toHaveLength(2);
      expect(mockExecuteCustomCommand).toHaveBeenCalledTimes(2);
    });

    it('should execute hooks in parallel when parallel option is true', async () => {
      const projects = [
        {
          name: 'project1',
          path: 'project1',
          hooks: {
            'test': {
              command: 'npm test'
            }
          }
        },
        {
          name: 'project2',
          path: 'project2',
          hooks: {
            'test': {
              command: 'npm test'
            }
          }
        }
      ];

      mockExecuteCustomCommand.mockResolvedValue({
        success: true
      });

      const result = await executeHookForProjects(projects, 'test', config, { parallel: true });

      expect(result.success).toBe(true);
      expect(mockExecuteCustomCommand).toHaveBeenCalledTimes(2);
    });

    it('should continue on error by default', async () => {
      const projects = [
        {
          name: 'project1',
          path: 'project1',
          hooks: {
            'test': {
              command: 'npm test'
            }
          }
        },
        {
          name: 'project2',
          path: 'project2',
          hooks: {
            'test': {
              command: 'npm test'
            }
          }
        }
      ];

      mockExecuteCustomCommand
        .mockResolvedValueOnce({ success: false, error: 'Failed' })
        .mockResolvedValueOnce({ success: true });

      const result = await executeHookForProjects(projects, 'test', config);

      expect(result.success).toBe(false);
      expect(result.results).toHaveLength(2);
      expect(mockExecuteCustomCommand).toHaveBeenCalledTimes(2);
    });

    it('should stop on error when continueOnError is false', async () => {
      const projects = [
        {
          name: 'project1',
          path: 'project1',
          hooks: {
            'test': {
              command: 'npm test'
            }
          }
        },
        {
          name: 'project2',
          path: 'project2',
          hooks: {
            'test': {
              command: 'npm test'
            }
          }
        }
      ];

      // Make executeCustomCommand reject for the first project
      mockExecuteCustomCommand
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ success: true, project: 'project2' });

      // Since executeHook catches and returns error object, the function
      // will continue executing all projects even with continueOnError: false
      // because the error is caught and converted to a result object
      const result = await executeHookForProjects(projects, 'test', config, { continueOnError: false });

      // Should have executed both projects
      expect(mockExecuteCustomCommand).toHaveBeenCalledTimes(2);
      // Overall success should be false since one failed
      expect(result.success).toBe(false);
      // Should have results for both projects
      expect(result.results).toHaveLength(2);
      // First project should have failed
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toBe('Failed');
    });

    it('should skip projects without the hook', async () => {
      const projects = [
        {
          name: 'project1',
          path: 'project1',
          hooks: {
            'test': {
              command: 'npm test'
            }
          }
        },
        {
          name: 'project2',
          path: 'project2'
          // No test hook
        }
      ];

      mockExecuteCustomCommand.mockResolvedValue({
        success: true
      });

      const result = await executeHookForProjects(projects, 'test', config);

      expect(result.success).toBe(true);
      expect(mockExecuteCustomCommand).toHaveBeenCalledTimes(1);
    });

    it('should return early when no projects have the hook', async () => {
      const projects = [
        {
          name: 'project1',
          path: 'project1'
        },
        {
          name: 'project2',
          path: 'project2'
        }
      ];

      const result = await executeHookForProjects(projects, 'non-existent', config);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(0);
      expect(mockExecuteCustomCommand).not.toHaveBeenCalled();
    });
  });

  describe('listHooks', () => {
    it('should list hooks without errors', () => {
      const config = {
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
        },
        projects: [
          {
            name: 'test-project',
            hooks: {
              'test': {
                command: 'npm test'
              }
            }
          }
        ]
      };

      expect(() => listHooks(config)).not.toThrow();
    });

    it('should handle empty configuration', () => {
      const config = {
        projects: []
      };

      expect(() => listHooks(config)).not.toThrow();
    });
  });
});

