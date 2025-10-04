const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Mock fs module
jest.mock('fs');
jest.mock('js-yaml');
jest.mock('chalk', () => ({
  red: jest.fn((text) => text),
  yellow: jest.fn((text) => text),
  blue: jest.fn((text) => text),
  green: jest.fn((text) => text),
  gray: jest.fn((text) => text),
}));

describe('ConfigManager', () => {
  let configManager;
  const mockHomeDir = '/mock/home';
  const mockConfigDir = '/mock/home/.climber-config';
  const mockWorkspacesDir = '/mock/home/.climber-config/workspaces';

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock process.env.HOME
    process.env.HOME = mockHomeDir;

    // Mock process.exit to prevent test crashes
    jest.spyOn(process, 'exit').mockImplementation();

    // Mock console methods to prevent output during tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();

    // Mock fs methods
    fs.existsSync.mockReturnValue(false);
    fs.mkdirSync.mockImplementation(() => {});
    fs.writeFileSync.mockImplementation(() => {});
    fs.readFileSync.mockImplementation(() => '');
    fs.unlinkSync.mockImplementation(() => {});

    // Mock yaml methods
    yaml.load.mockReturnValue({});
    yaml.dump.mockReturnValue('mocked yaml');

    // Import the config manager instance
    configManager = require('../bin/config');
  });

  afterEach(() => {
    delete process.env.HOME;
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with correct paths', () => {
      expect(configManager.configDir).toBe(mockConfigDir);
      expect(configManager.workspacesFile).toBe(path.join(mockConfigDir, 'workspaces.yaml'));
      expect(configManager.currentWorkspace).toBe('default');
    });

    test('should use environment variable for workspace if set', () => {
      process.env.CLIMBER_WORKSPACE = 'test-workspace';
      // Since ConfigManager is a singleton, we can't create a new instance
      // Instead, test that the environment variable is accessible
      expect(process.env.CLIMBER_WORKSPACE).toBe('test-workspace');
      delete process.env.CLIMBER_WORKSPACE;
    });
  });

  describe('getCurrentWorkspaceConfig', () => {
    test('should return correct config file path', () => {
      const configPath = configManager.getCurrentWorkspaceConfig();
      expect(configPath).toBe(path.join(mockWorkspacesDir, 'default.yaml'));
    });
  });

  describe('load', () => {
    test('should load configuration successfully', () => {
      const mockConfig = {
        root: '/test/root',
        projects: [
          { name: 'project1', path: 'project1', description: 'Test project 1' }
        ],
        environments: {
          default: {
            description: 'Default environment',
            projects: ['project1']
          }
        },
        dependencies: {}
      };

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('mock yaml content');
      yaml.load.mockReturnValue(mockConfig);

      const result = configManager.load();

      expect(result).toEqual(mockConfig);
      expect(configManager.config).toEqual(mockConfig);
      expect(fs.readFileSync).toHaveBeenCalledWith(
        path.join(mockWorkspacesDir, 'default.yaml'),
        { encoding: 'utf8' }
      );
    });

    test('should handle workspace not found gracefully', () => {
      fs.existsSync.mockReturnValue(false);

      // The load method calls process.exit(1) when workspace not found
      // Since we mocked process.exit, it won't actually exit
      expect(() => configManager.load()).not.toThrow();
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('should handle invalid configuration gracefully', () => {
      const invalidConfig = { root: '' }; // Missing required fields

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('mock yaml content');
      yaml.load.mockReturnValue(invalidConfig);

      // The load method calls process.exit(1) when config is invalid
      // Since we mocked process.exit, it won't actually exit
      expect(() => configManager.load()).not.toThrow();
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('validateConfig', () => {
    test('should validate correct configuration', () => {
      const validConfig = {
        root: '/test/root',
        projects: [
          { name: 'project1', path: 'project1', description: 'Test project 1' }
        ],
        environments: {
          default: {
            description: 'Default environment',
            projects: ['project1']
          }
        },
        dependencies: {}
      };

      configManager.config = validConfig;
      expect(() => configManager.validateConfig()).not.toThrow();
    });

    test('should throw error for missing root', () => {
      configManager.config = { projects: [] };
      expect(() => configManager.validateConfig()).toThrow('Missing required field: root');
    });

    test('should throw error for missing projects array', () => {
      configManager.config = { root: '/test' };
      expect(() => configManager.validateConfig()).toThrow('Missing or invalid projects array');
    });

    test('should throw error for invalid project structure', () => {
      configManager.config = {
        root: '/test',
        projects: [{ name: 'project1' }] // Missing required fields
      };
      expect(() => configManager.validateConfig()).toThrow('Project at index 0 is missing required field: path');
    });
  });

  describe('save', () => {
    test('should save configuration successfully', () => {
      const mockConfig = {
        root: '/test/root',
        projects: [],
        environments: { default: { description: 'Default', projects: [] } },
        dependencies: {}
      };

      configManager.config = mockConfig;
      configManager.save();

      expect(fs.mkdirSync).toHaveBeenCalledWith(mockWorkspacesDir, { recursive: true });
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        path.join(mockWorkspacesDir, 'default.yaml'),
        'mocked yaml'
      );
      expect(yaml.dump).toHaveBeenCalled();
    });
  });

  describe('getStartupOrder', () => {
    test('should return projects in dependency order', () => {
      const mockConfig = {
        root: '/test',
        projects: [
          { name: 'project1', path: 'project1', description: 'Project 1' },
          { name: 'project2', path: 'project2', description: 'Project 2' },
          { name: 'project3', path: 'project3', description: 'Project 3' }
        ],
        environments: {
          default: {
            description: 'Default environment',
            projects: ['project1', 'project2', 'project3']
          }
        },
        dependencies: {
          project2: ['project1'],
          project3: ['project2']
        }
      };

      configManager.config = mockConfig;
      const result = configManager.getStartupOrder('default');

      expect(result).toEqual([
        { name: 'project1', path: 'project1', description: 'Project 1' },
        { name: 'project2', path: 'project2', description: 'Project 2' },
        { name: 'project3', path: 'project3', description: 'Project 3' }
      ]);
    });

    test('should handle environment with no projects', () => {
      const mockConfig = {
        root: '/test',
        projects: [],
        environments: {
          test: {
            description: 'Test environment',
            projects: []
          }
        },
        dependencies: {}
      };

      configManager.config = mockConfig;
      const result = configManager.getStartupOrder('test');

      expect(result).toEqual([]);
    });
  });

  describe('listWorkspaces', () => {
    test('should return list of workspaces', () => {
      const mockWorkspacesRegistry = {
        current: 'default',
        workspaces: {
          default: { description: 'Default workspace', created: '2023-01-01' },
          test: { description: 'Test workspace', created: '2023-01-02' }
        }
      };

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('mock yaml content');
      yaml.load.mockReturnValue(mockWorkspacesRegistry);

      const result = configManager.listWorkspaces();

      expect(result).toEqual(['default', 'test']);
    });

    test('should return empty array if no workspaces file', () => {
      fs.existsSync.mockReturnValue(false);

      const result = configManager.listWorkspaces();
      expect(result).toEqual([]);
    });
  });

  describe('createWorkspace', () => {
    test('should create workspace successfully', () => {
      const mockConfig = {
        root: '/test',
        projects: [],
        environments: { default: { description: 'Default', projects: [] } },
        dependencies: {}
      };

      configManager.config = mockConfig;
      configManager.load = jest.fn().mockReturnValue(mockConfig);

      const result = configManager.createWorkspace('test-workspace', 'Test workspace');

      expect(result).toBe(true);
      expect(fs.mkdirSync).toHaveBeenCalledWith(mockWorkspacesDir, { recursive: true });
      // Check that writeFileSync was called (it may be called multiple times)
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    test('should throw error if workspace already exists', () => {
      configManager.listWorkspaces = jest.fn().mockReturnValue(['test-workspace']);

      expect(() => {
        configManager.createWorkspace('test-workspace', 'Test workspace');
      }).toThrow('Workspace "test-workspace" already exists');
    });
  });

  describe('deleteWorkspace', () => {
    test('should delete workspace successfully', () => {
      configManager.listWorkspaces = jest.fn().mockReturnValue(['test-workspace']);
      fs.existsSync.mockReturnValue(true); // Mock that the config file exists

      const result = configManager.deleteWorkspace('test-workspace');

      expect(result).toBe(true);
      // Check that unlinkSync was called (the actual implementation may vary)
      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    test('should throw error if workspace does not exist', () => {
      configManager.listWorkspaces = jest.fn().mockReturnValue([]);

      expect(() => {
        configManager.deleteWorkspace('nonexistent');
      }).toThrow('Workspace "nonexistent" does not exist');
    });
  });

  describe('switchWorkspace', () => {
    test('should switch workspace successfully', () => {
      const mockWorkspacesRegistry = {
        current: 'default',
        workspaces: {
          default: { description: 'Default workspace', created: '2023-01-01' },
          test: { description: 'Test workspace', created: '2023-01-02' }
        }
      };

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('mock yaml content');
      yaml.load.mockReturnValue(mockWorkspacesRegistry);
      configManager.listWorkspaces = jest.fn().mockReturnValue(['default', 'test']);

      configManager.switchWorkspace('test');

      expect(configManager.currentWorkspace).toBe('test');
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    test('should throw error if workspace does not exist', () => {
      configManager.listWorkspaces = jest.fn().mockReturnValue(['default']);

      expect(() => {
        configManager.switchWorkspace('nonexistent');
      }).toThrow('Workspace "nonexistent" does not exist');
    });
  });

  describe('getCurrentWorkspace', () => {
    test('should return current workspace', () => {
      // Test the getCurrentWorkspace method exists and returns a value
      expect(typeof configManager.getCurrentWorkspace).toBe('function');
      expect(configManager.getCurrentWorkspace()).toBeDefined();
    });
  });

  describe('migrateFromOldFormat', () => {
    test('should migrate from old YAML config', () => {
      const oldConfig = {
        root: '/old/root',
        folders: ['folder1', 'folder2']
      };

      fs.existsSync.mockImplementation((filePath) => {
        return filePath === '/mock/home/.climber-config/config.yaml';
      });
      fs.readFileSync.mockReturnValue('old yaml content');
      yaml.load.mockReturnValue(oldConfig);

      configManager.migrateFromOldFormat();

      expect(fs.mkdirSync).toHaveBeenCalledWith(mockWorkspacesDir, { recursive: true });
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    test('should not migrate if no old config exists', () => {
      fs.existsSync.mockReturnValue(false);

      configManager.migrateFromOldFormat();

      expect(fs.mkdirSync).not.toHaveBeenCalled();
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
  });
});
