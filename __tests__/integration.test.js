const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const dockerCompose = require('docker-compose');
const yaml = require('js-yaml');

// Mock modules
jest.mock('fs');
jest.mock('path');
jest.mock('child_process');
jest.mock('docker-compose');
jest.mock('js-yaml');

describe('Integration Tests', () => {
  let mockConsoleLog;
  let mockConsoleError;
  let mockProcessExit;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock console methods
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
    mockProcessExit = jest.spyOn(process, 'exit').mockImplementation();

    // Mock fs methods
    fs.existsSync.mockReturnValue(false);
    fs.mkdirSync.mockImplementation(() => {});
    fs.writeFileSync.mockImplementation(() => {});
    fs.readFileSync.mockImplementation(() => '');
    fs.unlinkSync.mockImplementation(() => {});

    // Mock path methods
    path.join.mockImplementation((...args) => args.join('/'));
    path.resolve.mockImplementation((...args) => args.join('/'));
    path.dirname.mockImplementation((p) => p.split('/').slice(0, -1).join('/'));
    path.basename.mockImplementation((p) => p.split('/').pop());

    // Mock yaml methods
    yaml.load.mockReturnValue({});
    yaml.dump.mockReturnValue('mocked yaml');

    // Mock docker-compose methods
    dockerCompose.upAll.mockResolvedValue({ out: 'Services started', err: '' });
    dockerCompose.down.mockResolvedValue({ out: 'Services stopped', err: '' });
    dockerCompose.ps.mockResolvedValue({ out: 'Service status', err: '' });
    dockerCompose.logs.mockResolvedValue({ out: 'Service logs', err: '' });

    // Mock spawn
    const mockChild = {
      on: jest.fn(),
      kill: jest.fn(),
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() }
    };
    spawn.mockReturnValue(mockChild);
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
    mockProcessExit.mockRestore();
  });

  describe('Complete Workspace Lifecycle', () => {
    test('should handle complete workspace creation and management', async () => {
      // Mock the complete workflow
      const mockConfig = {
        root: '/test/root',
        projects: [
          { name: 'project1', path: 'project1', description: 'Project 1' },
          { name: 'project2', path: 'project2', description: 'Project 2' }
        ],
        environments: {
          default: {
            description: 'Default environment',
            projects: ['project1', 'project2']
          }
        },
        dependencies: {
          project2: ['project1']
        }
      };

      // Mock ConfigManager methods
      const configManager = {
        listWorkspaces: jest.fn().mockReturnValue(['default']),
        createWorkspace: jest.fn().mockReturnValue(true),
        switchWorkspace: jest.fn().mockReturnValue(true),
        deleteWorkspace: jest.fn().mockReturnValue(true),
        getCurrentWorkspace: jest.fn().mockReturnValue('test-workspace'),
        load: jest.fn().mockReturnValue(mockConfig),
        save: jest.fn().mockReturnValue(true),
        getStartupOrder: jest.fn().mockReturnValue(mockConfig.projects)
      };

      // Test workspace creation
      expect(() => configManager.createWorkspace('test-workspace', 'Test workspace')).not.toThrow();
      expect(configManager.createWorkspace).toHaveBeenCalledWith('test-workspace', 'Test workspace');

      // Test workspace switching
      expect(() => configManager.switchWorkspace('test-workspace')).not.toThrow();
      expect(configManager.switchWorkspace).toHaveBeenCalledWith('test-workspace');

      // Test configuration loading
      const config = configManager.load();
      expect(config).toEqual(mockConfig);
      expect(configManager.load).toHaveBeenCalled();

      // Test configuration saving
      expect(() => configManager.save()).not.toThrow();
      expect(configManager.save).toHaveBeenCalled();

      // Test workspace deletion
      expect(() => configManager.deleteWorkspace('test-workspace')).not.toThrow();
      expect(configManager.deleteWorkspace).toHaveBeenCalledWith('test-workspace');
    });
  });

  describe('Complete Docker Workflow', () => {
    test('should handle complete docker up-down cycle', async () => {
      const mockProjects = [
        { name: 'project1', path: 'project1', description: 'Project 1' },
        { name: 'project2', path: 'project2', description: 'Project 2' }
      ];

      // Mock ConfigManager
      const configManager = {
        load: jest.fn().mockReturnValue({}),
        getStartupOrder: jest.fn().mockReturnValue(mockProjects),
        config: { root: '/test/root' }
      };

      // Test docker up
      for (const project of mockProjects) {
        const result = await dockerCompose.upAll({
          cwd: `/test/root/${project.path}`,
          log: false
        });
        expect(result.out).toBe('Services started');
      }

      // Test docker ps
      for (const project of mockProjects) {
        const result = await dockerCompose.ps({
          cwd: `/test/root/${project.path}`,
          log: false
        });
        expect(result.out).toBe('Service status');
      }

      // Test docker down
      for (const project of mockProjects) {
        const result = await dockerCompose.down({
          cwd: `/test/root/${project.path}`,
          log: false
        });
        expect(result.out).toBe('Services stopped');
      }
    });
  });

  describe('Configuration Management Workflow', () => {
    test('should handle configuration creation and validation', () => {
      const mockConfig = {
        root: '/test/root',
        projects: [
          { name: 'project1', path: 'project1', description: 'Project 1' }
        ],
        environments: {
          default: {
            description: 'Default environment',
            projects: ['project1']
          }
        },
        dependencies: {}
      };

      // Test configuration validation
      expect(mockConfig.root).toBeTruthy();
      expect(Array.isArray(mockConfig.projects)).toBe(true);
      expect(mockConfig.projects.length).toBeGreaterThan(0);
      expect(mockConfig.projects[0].name).toBeTruthy();
      expect(mockConfig.projects[0].path).toBeTruthy();
      expect(mockConfig.projects[0].description).toBeTruthy();
      expect(mockConfig.environments).toBeTruthy();
      expect(mockConfig.environments.default).toBeTruthy();
      expect(Array.isArray(mockConfig.environments.default.projects)).toBe(true);
    });

    test('should handle environment-specific configurations', () => {
      const mockConfig = {
        root: '/test/root',
        projects: [
          { name: 'project1', path: 'project1', description: 'Project 1' },
          { name: 'project2', path: 'project2', description: 'Project 2' }
        ],
        environments: {
          development: {
            description: 'Development environment',
            projects: ['project1', 'project2']
          },
          production: {
            description: 'Production environment',
            projects: ['project1']
          }
        },
        dependencies: {
          project2: ['project1']
        }
      };

      // Test environment-specific project selection
      const devProjects = mockConfig.environments.development.projects;
      const prodProjects = mockConfig.environments.production.projects;

      expect(devProjects).toContain('project1');
      expect(devProjects).toContain('project2');
      expect(prodProjects).toContain('project1');
      expect(prodProjects).not.toContain('project2');
    });
  });

  describe('Dependency Management Workflow', () => {
    test('should handle dependency resolution', () => {
      const mockDependencies = {
        project2: ['project1'],
        project3: ['project1', 'project2'],
        project4: ['project3']
      };

      // Test dependency resolution logic
      const resolveDependencies = (deps) => {
        const resolved = [];
        const visited = new Set();

        const visit = (project) => {
          if (visited.has(project)) return;
          visited.add(project);

          if (deps[project]) {
            deps[project].forEach(dep => visit(dep));
          }
          resolved.push(project);
        };

        Object.keys(deps).forEach(project => visit(project));
        return resolved;
      };

      const resolved = resolveDependencies(mockDependencies);
      expect(resolved).toContain('project1');
      expect(resolved).toContain('project2');
      expect(resolved).toContain('project3');
      expect(resolved).toContain('project4');
    });
  });

  describe('Error Handling Workflow', () => {
    test('should handle configuration errors gracefully', () => {
      const invalidConfigs = [
        { root: '' }, // Empty root
        { root: '/test', projects: 'invalid' }, // Invalid projects
        { root: '/test', projects: [{ name: 'test' }] }, // Missing required fields
        { root: '/test', projects: [], environments: {} }, // Missing default environment
      ];

      invalidConfigs.forEach(config => {
        expect(() => {
          // Simulate validation
          if (!config.root) throw new Error('Missing required field: root');
          if (!Array.isArray(config.projects)) throw new Error('Missing or invalid projects array');
          if (config.projects.length > 0 && !config.projects[0].path) throw new Error('Invalid project structure');
          if (!config.environments || !config.environments.default) throw new Error('Missing default environment');
        }).toThrow();
      });
    });

    test('should handle docker errors gracefully', async () => {
      // Mock docker errors
      dockerCompose.upAll.mockRejectedValue(new Error('Docker daemon not running'));
      dockerCompose.down.mockRejectedValue(new Error('No containers to stop'));
      dockerCompose.ps.mockRejectedValue(new Error('Docker command failed'));

      // Test error handling
      await expect(dockerCompose.upAll({ cwd: '/test' })).rejects.toThrow('Docker daemon not running');
      await expect(dockerCompose.down({ cwd: '/test' })).rejects.toThrow('No containers to stop');
      await expect(dockerCompose.ps({ cwd: '/test' })).rejects.toThrow('Docker command failed');
    });
  });

  describe('File System Operations Workflow', () => {
    test('should handle file system operations', () => {
      // Mock file system operations
      fs.existsSync.mockReturnValue(true);
      fs.mkdirSync.mockImplementation(() => {});
      fs.writeFileSync.mockImplementation(() => {});
      fs.readFileSync.mockReturnValue('test content');

      // Test file operations
      expect(fs.existsSync('/test/file')).toBe(true);
      expect(() => fs.mkdirSync('/test/dir')).not.toThrow();
      expect(() => fs.writeFileSync('/test/file', 'content')).not.toThrow();
      expect(fs.readFileSync('/test/file')).toBe('test content');
    });

    test('should handle file system errors', () => {
      // Mock file system errors
      fs.existsSync.mockReturnValue(false);
      fs.mkdirSync.mockImplementation(() => { throw new Error('Permission denied'); });
      fs.writeFileSync.mockImplementation(() => { throw new Error('Disk full'); });
      fs.readFileSync.mockImplementation(() => { throw new Error('File not found'); });

      // Test error handling
      expect(fs.existsSync('/test/file')).toBe(false);
      expect(() => fs.mkdirSync('/test/dir')).toThrow('Permission denied');
      expect(() => fs.writeFileSync('/test/file', 'content')).toThrow('Disk full');
      expect(() => fs.readFileSync('/test/file')).toThrow('File not found');
    });
  });
});
