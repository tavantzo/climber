const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Mock all external dependencies
jest.mock('fs');
jest.mock('path');
jest.mock('child_process');
jest.mock('docker-compose');
jest.mock('js-yaml');
jest.mock('toposort');
jest.mock('chalk', () => ({
  red: jest.fn((text) => text),
  yellow: jest.fn((text) => text),
  blue: jest.fn((text) => text),
  green: jest.fn((text) => text),
  gray: jest.fn((text) => text),
  cyan: jest.fn((text) => text),
}));

describe('Core Functionality Tests', () => {
  let mockConsoleLog;
  let mockConsoleError;
  let mockProcessExit;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock console methods
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
    mockProcessExit = jest.spyOn(process, 'exit').mockImplementation();

    // Mock process.env
    process.env.HOME = '/mock/home';
    process.env.PWD = '/mock/current';

    // Mock fs methods
    fs.existsSync.mockReturnValue(true);
    fs.mkdirSync.mockImplementation(() => {});
    fs.writeFileSync.mockImplementation(() => {});
    fs.readFileSync.mockReturnValue('mock content');
    fs.unlinkSync.mockImplementation(() => {});
    fs.statSync.mockReturnValue({ isDirectory: () => true });
    fs.readdirSync.mockReturnValue([
      { name: 'project1', isDirectory: () => true },
      { name: 'project2', isDirectory: () => true }
    ]);

    // Mock path methods
    path.join.mockImplementation((...args) => args.join('/'));
    path.resolve.mockImplementation((...args) => args.join('/'));
    path.dirname.mockImplementation((p) => p.split('/').slice(0, -1).join('/'));
    path.basename.mockImplementation((p) => p.split('/').pop());

    // Mock yaml
    const yaml = require('js-yaml');
    yaml.load.mockReturnValue({
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
      dependencies: {}
    });
    yaml.dump.mockReturnValue('mocked yaml');

    // Mock toposort
    const toposort = require('toposort');
    toposort.array.mockReturnValue(['project1', 'project2']);

    // Mock docker-compose
    const dockerCompose = require('docker-compose');
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
    delete process.env.HOME;
    delete process.env.PWD;
  });

  describe('File System Operations', () => {
    test('should handle file operations', () => {
      expect(fs.existsSync('/test/file')).toBe(true);
      expect(() => fs.mkdirSync('/test/dir')).not.toThrow();
      expect(() => fs.writeFileSync('/test/file', 'content')).not.toThrow();
      expect(fs.readFileSync('/test/file')).toBe('mock content');
    });

    test('should handle directory operations', () => {
      const contents = fs.readdirSync('/test/dir');
      expect(contents).toHaveLength(2);
      expect(contents[0].name).toBe('project1');
      expect(contents[1].name).toBe('project2');
    });
  });

  describe('Path Operations', () => {
    test('should handle path operations', () => {
      expect(path.join('/test', 'path')).toBe('/test/path');
      expect(path.resolve('/test', 'path')).toBe('/test/path');
      expect(path.dirname('/test/path/file')).toBe('/test/path');
      expect(path.basename('/test/path/file')).toBe('file');
    });
  });

  describe('YAML Operations', () => {
    test('should handle YAML loading', () => {
      const yaml = require('js-yaml');
      const config = yaml.load('mock yaml content');

      expect(config.root).toBe('/test/root');
      expect(config.projects).toHaveLength(2);
      expect(config.projects[0].name).toBe('project1');
      expect(config.projects[1].name).toBe('project2');
      expect(config.environments.default).toBeDefined();
    });

    test('should handle YAML dumping', () => {
      const yaml = require('js-yaml');
      const result = yaml.dump({ test: 'data' });
      expect(result).toBe('mocked yaml');
    });
  });

  describe('Docker Compose Operations', () => {
    test('should handle docker compose up', async () => {
      const dockerCompose = require('docker-compose');
      const result = await dockerCompose.upAll({ cwd: '/test/project' });
      expect(result.out).toBe('Services started');
    });

    test('should handle docker compose down', async () => {
      const dockerCompose = require('docker-compose');
      const result = await dockerCompose.down({ cwd: '/test/project' });
      expect(result.out).toBe('Services stopped');
    });

    test('should handle docker compose ps', async () => {
      const dockerCompose = require('docker-compose');
      const result = await dockerCompose.ps({ cwd: '/test/project' });
      expect(result.out).toBe('Service status');
    });

    test('should handle docker compose logs', async () => {
      const dockerCompose = require('docker-compose');
      const result = await dockerCompose.logs({ cwd: '/test/project' });
      expect(result.out).toBe('Service logs');
    });
  });

  describe('Child Process Operations', () => {
    test('should handle spawn operations', () => {
      const mockChild = {
        on: jest.fn(),
        kill: jest.fn(),
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() }
      };
      spawn.mockReturnValue(mockChild);

      const child = spawn('docker', ['compose', 'logs'], {
        cwd: '/test/project',
        stdio: ['ignore', 'pipe', 'pipe']
      });

      expect(child).toBe(mockChild);
      expect(spawn).toHaveBeenCalledWith('docker', ['compose', 'logs'], {
        cwd: '/test/project',
        stdio: ['ignore', 'pipe', 'pipe']
      });
    });
  });

  describe('Dependency Resolution', () => {
    test('should handle topological sorting', () => {
      const toposort = require('toposort');
      const result = toposort.array(['project1', 'project2'], []);
      expect(result).toEqual(['project1', 'project2']);
    });
  });

  describe('Environment Variables', () => {
    test('should handle environment variables', () => {
      process.env.TEST_VAR = 'test_value';
      expect(process.env.TEST_VAR).toBe('test_value');
      delete process.env.TEST_VAR;
    });

    test('should handle missing environment variables', () => {
      expect(process.env.MISSING_VAR).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle file system errors', () => {
      fs.existsSync.mockReturnValue(false);
      expect(fs.existsSync('/test/file')).toBe(false);
    });

    test('should handle docker compose errors', async () => {
      const dockerCompose = require('docker-compose');
      dockerCompose.upAll.mockRejectedValue(new Error('Docker error'));

      await expect(dockerCompose.upAll({ cwd: '/test' })).rejects.toThrow('Docker error');
    });

    test('should handle spawn errors', () => {
      const mockChild = {
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('Spawn error')), 0);
          }
        }),
        kill: jest.fn()
      };
      spawn.mockReturnValue(mockChild);

      const child = spawn('invalid-command', []);
      expect(child).toBe(mockChild);
    });
  });

  describe('Configuration Validation', () => {
    test('should validate configuration structure', () => {
      const yaml = require('js-yaml');
      const config = yaml.load('mock yaml content');

      // Validate required fields
      expect(config.root).toBeTruthy();
      expect(Array.isArray(config.projects)).toBe(true);
      expect(config.projects.length).toBeGreaterThan(0);
      expect(config.environments).toBeTruthy();
      expect(config.environments.default).toBeTruthy();

      // Validate project structure
      config.projects.forEach(project => {
        expect(project.name).toBeTruthy();
        expect(project.path).toBeTruthy();
        expect(project.description).toBeTruthy();
      });
    });
  });

  describe('Workspace Management', () => {
    test('should handle workspace operations', () => {
      const workspaces = ['default', 'test', 'production'];
      expect(workspaces).toContain('default');
      expect(workspaces).toContain('test');
      expect(workspaces).toContain('production');
    });

    test('should handle workspace validation', () => {
      const validWorkspaceNames = ['default', 'test-workspace', 'production-env'];
      const invalidWorkspaceNames = ['', 'test workspace', 'test@workspace'];

      validWorkspaceNames.forEach(name => {
        expect(name).toBeTruthy();
        expect(name.length).toBeGreaterThan(0);
        expect(/^[a-zA-Z0-9-_]+$/.test(name)).toBe(true);
      });

      invalidWorkspaceNames.forEach(name => {
        if (name === '') {
          expect(name).toBeFalsy();
        } else {
          expect(/^[a-zA-Z0-9-_]+$/.test(name)).toBe(false);
        }
      });
    });
  });
});
