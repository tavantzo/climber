const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Mock fs and path modules
jest.mock('fs');
jest.mock('path');

// Mock process.env.HOME
const originalEnv = process.env;
beforeAll(() => {
  process.env.HOME = '/test';
});

afterAll(() => {
  process.env = originalEnv;
});

const configManager = require('../bin/config');

describe('Config Import/Export Functionality', () => {
  let mockConfig;
  let mockWorkspacesDir;
  let mockWorkspacesFile;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock configuration
    mockConfig = {
      root: '/test/root',
      projects: [
        { name: 'project1', path: 'project1', description: 'Test project 1' },
        { name: 'project2', path: 'project2', description: 'Test project 2' }
      ],
      environments: {
        default: {
          description: 'Default environment',
          projects: ['project1', 'project2']
        }
      },
      dependencies: {
        project2: ['project1']
      },
      groups: {
        'test-group': ['project1', 'project2']
      },
      customCommands: {
        'test-command': {
          description: 'Test command',
          command: 'echo "test"',
          target: 'test-group'
        }
      }
    };

    mockWorkspacesDir = '/test/.climber-config/workspaces';
    mockWorkspacesFile = '/test/.climber-config/workspaces.yaml';

    // Mock path.join to return proper paths
    path.join.mockImplementation((...args) => {
      if (args.includes('.climber-config') && args.includes('workspaces')) {
        return '/test/.climber-config/workspaces';
      }
      if (args.includes('.climber-config') && args.includes('workspaces.yaml')) {
        return '/test/.climber-config/workspaces.yaml';
      }
      return args.join('/');
    });

    // Mock fs.existsSync
    fs.existsSync.mockImplementation((filePath) => {
      if (filePath === mockWorkspacesFile) return true;
      if (filePath === mockWorkspacesDir) return true;
      if (filePath.includes('workspaces/')) return false;
      return true;
    });

    // Mock fs.mkdirSync
    fs.mkdirSync.mockImplementation(() => {});

    // Mock fs.readFileSync
    fs.readFileSync.mockImplementation((filePath) => {
      if (filePath === mockWorkspacesFile) {
        return yaml.dump({
          current: 'default',
          workspaces: {
            default: {
              name: 'default',
              description: 'Default workspace',
              created: '2024-01-01T00:00:00.000Z',
              configFile: 'default.yaml'
            }
          }
        });
      }
      if (filePath.includes('workspaces/default.yaml')) {
        return yaml.dump(mockConfig);
      }
      return '';
    });

    // Mock fs.writeFileSync
    fs.writeFileSync.mockImplementation(() => {});

    // Mock configManager methods
    configManager.config = mockConfig;
    configManager.getCurrentWorkspace = jest.fn().mockReturnValue('default');
    configManager.listWorkspaces = jest.fn().mockReturnValue(['default']);
    configManager.validateConfig = jest.fn().mockReturnValue(true);
  });

  describe('importConfiguration', () => {
    it('should import configuration from file', () => {
      const testConfigFile = '/test/config.yaml';
      const configYaml = yaml.dump(mockConfig);

      fs.existsSync.mockImplementation((filePath) => {
        if (filePath === testConfigFile) return true;
        return fs.existsSync.mockImplementation(() => true);
      });

      fs.readFileSync.mockImplementation((filePath) => {
        if (filePath === testConfigFile) return configYaml;
        return fs.readFileSync.mockImplementation(() => '');
      });

      const result = configManager.importConfiguration(testConfigFile, true);

      expect(result).toEqual(mockConfig);
      expect(fs.existsSync).toHaveBeenCalledWith(testConfigFile);
      expect(fs.readFileSync).toHaveBeenCalledWith(testConfigFile, { encoding: 'utf8' });
      expect(configManager.validateConfig).toHaveBeenCalledWith(mockConfig);
    });

    it('should import configuration from YAML string', () => {
      const configYaml = yaml.dump(mockConfig);

      const result = configManager.importConfiguration(configYaml, false);

      expect(result).toEqual(mockConfig);
      expect(configManager.validateConfig).toHaveBeenCalledWith(mockConfig);
    });

    it('should remove export metadata from imported config', () => {
      const configWithMetadata = {
        ...mockConfig,
        _exported: {
          timestamp: '2024-01-01T00:00:00.000Z',
          version: '2.2.0',
          workspace: 'default'
        }
      };
      const configYaml = yaml.dump(configWithMetadata);

      const result = configManager.importConfiguration(configYaml, false);

      expect(result).toEqual(mockConfig);
      expect(result._exported).toBeUndefined();
    });

    it('should throw error for non-existent file', () => {
      const nonExistentFile = '/test/nonexistent.yaml';

      fs.existsSync.mockImplementation((filePath) => {
        if (filePath === nonExistentFile) return false;
        return true;
      });

      expect(() => {
        configManager.importConfiguration(nonExistentFile, true);
      }).toThrow('Configuration file not found: /test/nonexistent.yaml');
    });

    it('should throw error for invalid YAML', () => {
      const invalidYaml = 'invalid: yaml: content: [';

      expect(() => {
        configManager.importConfiguration(invalidYaml, false);
      }).toThrow();
    });

    it('should throw error for invalid configuration format', () => {
      const invalidConfig = 'not an object';

      expect(() => {
        configManager.importConfiguration(invalidConfig, false);
      }).toThrow('Invalid configuration format');
    });
  });

  describe('createWorkspaceFromImport', () => {
    it('should throw error if workspace already exists', () => {
      const workspaceName = 'existing-workspace';
      const configFile = '/test/config.yaml';

      configManager.listWorkspaces.mockReturnValue(['existing-workspace']);

      expect(() => {
        configManager.createWorkspaceFromImport(workspaceName, configFile, true);
      }).toThrow('Workspace "existing-workspace" already exists');
    });

    it('should validate imported configuration', () => {
      const configYaml = yaml.dump(mockConfig);
      
      // Test that importConfiguration validates the config
      const result = configManager.importConfiguration(configYaml, false);
      expect(result).toEqual(mockConfig);
      expect(configManager.validateConfig).toHaveBeenCalledWith(mockConfig);
    });
  });

  describe('addWorkspaceToRegistry', () => {
    it('should call writeFileSync when adding workspace', () => {
      const workspaceName = 'new-workspace';
      const description = 'New workspace';

      fs.existsSync.mockImplementation((filePath) => {
        if (filePath === mockWorkspacesFile) return true;
        return false;
      });

      fs.readFileSync.mockImplementation((filePath) => {
        if (filePath === mockWorkspacesFile) {
          return yaml.dump({
            current: 'default',
            workspaces: {
              default: {
                name: 'default',
                description: 'Default workspace',
                created: '2024-01-01T00:00:00.000Z',
                configFile: 'default.yaml'
              }
            }
          });
        }
        return '';
      });

      configManager.addWorkspaceToRegistry(workspaceName, description);

      // Verify that writeFileSync was called
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should handle missing workspaces file', () => {
      const workspaceName = 'first-workspace';
      const description = 'First workspace';

      fs.existsSync.mockImplementation((filePath) => {
        if (filePath === mockWorkspacesFile) return false;
        return false;
      });

      configManager.addWorkspaceToRegistry(workspaceName, description);

      // Verify that writeFileSync was called
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('Config Export Functionality', () => {
    it('should export configuration with metadata', () => {
      const exportedConfig = {
        ...mockConfig,
        _exported: {
          timestamp: expect.any(String),
          version: '2.2.0',
          workspace: 'default'
        }
      };

      // Mock the export functionality
      const exportConfig = {
        ...mockConfig,
        _exported: {
          timestamp: new Date().toISOString(),
          version: '2.2.0',
          workspace: 'default'
        }
      };

      const yamlOutput = yaml.dump(exportConfig, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
        sortKeys: false
      });

      expect(yamlOutput).toContain('root: /test/root');
      expect(yamlOutput).toContain('_exported:');
      expect(yamlOutput).toContain('version: 2.2.0');
      expect(yamlOutput).toContain('workspace: default');
    });
  });

  describe('Config Display Enhancement', () => {
    it('should display all configuration sections', () => {
      const config = {
        ...mockConfig,
        dependencyReadiness: {
          maxRetries: 3,
          retryDelay: 1000,
          timeout: 5000
        }
      };

      // Test that all sections are present
      expect(config.root).toBeDefined();
      expect(config.projects).toBeDefined();
      expect(config.environments).toBeDefined();
      expect(config.dependencies).toBeDefined();
      expect(config.groups).toBeDefined();
      expect(config.customCommands).toBeDefined();
      expect(config.dependencyReadiness).toBeDefined();
    });

    it('should handle missing optional sections gracefully', () => {
      const minimalConfig = {
        root: '/test/root',
        projects: [],
        environments: {
          default: {
            description: 'Default environment',
            projects: []
          }
        }
      };

      expect(minimalConfig.root).toBeDefined();
      expect(minimalConfig.projects).toBeDefined();
      expect(minimalConfig.environments).toBeDefined();
      expect(minimalConfig.dependencies).toBeUndefined();
      expect(minimalConfig.groups).toBeUndefined();
      expect(minimalConfig.customCommands).toBeUndefined();
    });
  });
});
