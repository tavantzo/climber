// Mock child_process
const mockSpawn = jest.fn();
jest.mock('child_process', () => ({
  spawn: mockSpawn
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

// Mock inquirer
jest.mock('inquirer', () => ({
  prompt: jest.fn()
}));

const inquirer = require('inquirer');

const {
  executeCustomCommand,
  executeCustomCommands,
  getTargetProjects,
  listCustomCommands,
  interactiveCommandExecution
} = require('../bin/custom-commands');

describe('Custom Commands', () => {
  let mockChild;

  beforeEach(() => {
    mockChild = {
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() },
      on: jest.fn(),
      kill: jest.fn()
    };
    mockSpawn.mockReturnValue(mockChild);
    jest.clearAllMocks();
  });

  describe('executeCustomCommand', () => {
    const project = {
      name: 'test-project',
      path: 'test-project',
      description: 'Test project'
    };

    const command = {
      name: 'test-command',
      description: 'Test command',
      command: 'echo "test"'
    };

    it('should execute command successfully', async () => {
      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
      });

      const result = await executeCustomCommand(project, '/test/path', command);

      expect(result.success).toBe(true);
      expect(result.project).toBe('test-project');
      expect(result.command).toBe('test-command');
      expect(mockSpawn).toHaveBeenCalledWith('echo', ['"test"'], expect.any(Object));
    });

    it('should handle command failure', async () => {
      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(1), 10);
        }
      });

      await expect(executeCustomCommand(project, '/test/path', command))
        .rejects.toThrow('Command "test-command" failed in test-project with exit code 1');
    });

    it('should handle spawn error', async () => {
      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('spawn failed')), 10);
        }
      });

      await expect(executeCustomCommand(project, '/test/path', command))
        .rejects.toThrow('spawn failed');
    });

    it('should run in interactive mode', async () => {
      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
      });

      await executeCustomCommand(project, '/test/path', command, { interactive: true });

      expect(mockSpawn).toHaveBeenCalledWith('echo', ['"test"'], expect.objectContaining({
        stdio: 'inherit'
      }));
    });
  });

  describe('getTargetProjects', () => {
    const allProjects = [
      { name: 'project1', path: 'project1' },
      { name: 'project2', path: 'project2' },
      { name: 'project3', path: 'project3' }
    ];

    const config = {
      groups: {
        'group1': ['project1', 'project2'],
        'group2': ['project3']
      }
    };

    it('should return all projects for "all" target', () => {
      const result = getTargetProjects(allProjects, 'all', config);
      expect(result).toEqual(allProjects);
    });

    it('should return specific project for project name', () => {
      const result = getTargetProjects(allProjects, 'project1', config);
      expect(result).toEqual([allProjects[0]]);
    });

    it('should return projects from group', () => {
      const result = getTargetProjects(allProjects, 'group1', config);
      expect(result).toEqual([allProjects[0], allProjects[1]]);
    });

    it('should return multiple projects for array target', () => {
      const result = getTargetProjects(allProjects, ['project1', 'project3'], config);
      expect(result).toEqual([allProjects[0], allProjects[2]]);
    });

    it('should return empty array for non-existent target', () => {
      const result = getTargetProjects(allProjects, 'nonexistent', config);
      expect(result).toEqual([]);
    });

    it('should handle mixed targets', () => {
      const result = getTargetProjects(allProjects, ['project1', 'group2'], config);
      expect(result).toEqual([allProjects[0], allProjects[2]]);
    });
  });

  describe('executeCustomCommands', () => {
    const config = {
      root: '/test/root',
      projects: [
        { name: 'project1', path: 'project1' },
        { name: 'project2', path: 'project2' }
      ],
      groups: {
        'test-group': ['project1', 'project2']
      },
      customCommands: {
        'test-command': {
          name: 'test-command',
          command: 'echo "test"'
        }
      }
    };

    it('should execute commands for all projects', async () => {
      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
      });

      const result = await executeCustomCommands('all', 'test-command', config);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].project).toBe('project1');
      expect(result.results[1].project).toBe('project2');
    });

    it('should execute commands for specific projects', async () => {
      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
      });

      const result = await executeCustomCommands('project1', 'test-command', config);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].project).toBe('project1');
    });

    it('should execute commands for group', async () => {
      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
      });

      const result = await executeCustomCommands('test-group', 'test-command', config);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
    });

    it('should handle command not found', async () => {
      await expect(executeCustomCommands('all', 'nonexistent-command', config))
        .rejects.toThrow('Custom command "nonexistent-command" not found');
    });

    it('should handle no projects found', async () => {
      const result = await executeCustomCommands('nonexistent', 'test-command', config);

      expect(result.success).toBe(true);
      expect(result.results).toEqual([]);
    });

    it('should execute commands in parallel', async () => {
      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
      });

      const result = await executeCustomCommands('all', 'test-command', config, { parallel: true });

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
    });

    it('should continue on error when specified', async () => {
      let callCount = 0;
      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          callCount++;
          // First call fails, second succeeds
          setTimeout(() => callback(callCount === 1 ? 1 : 0), 10);
        }
      });

      const result = await executeCustomCommands('all', 'test-command', config, { continueOnError: true });

      expect(result.success).toBe(false);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(false);
      expect(result.results[1].success).toBe(true);
    });
  });

  describe('listCustomCommands', () => {
    it('should list custom commands and groups', () => {
      const config = {
        customCommands: {
          'test-command': {
            description: 'Test command',
            command: 'echo "test"',
            target: 'all'
          }
        },
        groups: {
          'test-group': ['project1', 'project2']
        }
      };

      // Mock console.log to capture output
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      listCustomCommands(config);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Available Custom Commands'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('test-command'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Available Project Groups'));

      consoleSpy.mockRestore();
    });

    it('should handle no custom commands', () => {
      const config = {};

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      listCustomCommands(config);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No custom commands configured'));

      consoleSpy.mockRestore();
    });
  });

  describe('interactiveCommandExecution', () => {
    it('should handle no custom commands', async () => {
      const config = {};

      const result = await interactiveCommandExecution(config);

      expect(result.success).toBe(true);
      expect(result.results).toEqual([]);
    });

    it('should execute selected command interactively', async () => {
      const config = {
        root: '/test/root',
        customCommands: {
          'test-command': {
            description: 'Test command',
            command: 'echo "test"'
          }
        },
        projects: [
          { name: 'project1', path: 'project1' }
        ],
        groups: {}
      };

      // Mock inquirer responses
      inquirer.prompt
        .mockResolvedValueOnce({ selectedCommand: 'test-command' })
        .mockResolvedValueOnce({ selectedTarget: 'project1' });

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
      });

      const result = await interactiveCommandExecution(config);
      
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].project).toBe('project1');
    });

    it('should use default target when no target specified', async () => {
      const config = {
        root: '/test/root',
        customCommands: {
          'test-command': {
            description: 'Test command',
            command: 'echo "test"',
            target: 'test-group'
          }
        },
        projects: [
          { name: 'project1', path: 'project1' },
          { name: 'project2', path: 'project2' }
        ],
        groups: {
          'test-group': ['project1', 'project2']
        }
      };

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
      });

      // Execute without specifying target - should use default
      const result = await executeCustomCommands(undefined, 'test-command', config);
      
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].project).toBe('project1');
      expect(result.results[1].project).toBe('project2');
    });
  });
});
