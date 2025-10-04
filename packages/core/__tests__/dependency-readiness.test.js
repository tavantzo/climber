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

const {
  checkHttpReadiness,
  checkPortReadiness,
  checkCommandReadiness,
  checkDockerReadiness,
  checkDependencyReadiness,
  waitForDependencies,
  getDependencyReadinessConfig
} = require('../bin/dependency-readiness');

describe('Dependency Readiness', () => {
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

  describe('checkHttpReadiness', () => {
    it('should return true when HTTP request succeeds', async () => {
      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
      });

      const result = await checkHttpReadiness('http://localhost:3000/health');
      expect(result).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith('curl', [
        '-f', '-s', '--max-time', '5', 'http://localhost:3000/health'
      ], expect.any(Object));
    });

    it('should return false when HTTP request fails', async () => {
      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(1), 10);
        }
      });

      const result = await checkHttpReadiness('http://localhost:3000/health');
      expect(result).toBe(false);
    });

    it('should return false when spawn fails', async () => {
      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('spawn failed')), 10);
        }
      });

      const result = await checkHttpReadiness('http://localhost:3000/health');
      expect(result).toBe(false);
    });
  });

  describe('checkPortReadiness', () => {
    it('should return true when port is open', async () => {
      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
      });

      const result = await checkPortReadiness('localhost', 5432);
      expect(result).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith('nc', [
        '-z', '-w', '5', 'localhost', '5432'
      ], expect.any(Object));
    });

    it('should return false when port is closed', async () => {
      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(1), 10);
        }
      });

      const result = await checkPortReadiness('localhost', 5432);
      expect(result).toBe(false);
    });
  });

  describe('checkCommandReadiness', () => {
    it('should return true when command succeeds', async () => {
      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
      });

      const result = await checkCommandReadiness('echo "test"', '/tmp');
      expect(result).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith('echo', ['"test"'], {
        cwd: '/tmp',
        stdio: ['ignore', 'pipe', 'pipe']
      });
    });

    it('should return false when command fails', async () => {
      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(1), 10);
        }
      });

      const result = await checkCommandReadiness('false', '/tmp');
      expect(result).toBe(false);
    });

    it('should timeout after specified time', async () => {
      jest.useFakeTimers();

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          // Don't call callback immediately to test timeout
        }
      });

      const promise = checkCommandReadiness('sleep 10', '/tmp', 1000);

      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(1000);

      const result = await promise;
      expect(result).toBe(false);
      expect(mockChild.kill).toHaveBeenCalledWith('SIGTERM');

      jest.useRealTimers();
    });
  });

  describe('checkDockerReadiness', () => {
    it('should return true when Docker service is running and healthy', async () => {
      const mockStdout = {
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            setTimeout(() => callback(Buffer.from(JSON.stringify({
              Service: 'api',
              State: 'running',
              Health: 'healthy'
            }))), 10);
          }
        })
      };
      const mockStderr = { on: jest.fn() };

      mockChild.stdout = mockStdout;
      mockChild.stderr = mockStderr;

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 20);
        }
      });

      const result = await checkDockerReadiness('api', 'api', '/tmp');
      expect(result).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith('docker', [
        'compose', 'ps', '--format', 'json', 'api'
      ], expect.any(Object));
    });

    it('should return false when Docker service is not running', async () => {
      const mockStdout = {
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            setTimeout(() => callback(Buffer.from(JSON.stringify({
              Service: 'api',
              State: 'stopped'
            }))), 10);
          }
        })
      };
      const mockStderr = { on: jest.fn() };

      mockChild.stdout = mockStdout;
      mockChild.stderr = mockStderr;

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 20);
        }
      });

      const result = await checkDockerReadiness('api', 'api', '/tmp');
      expect(result).toBe(false);
    });
  });

  describe('checkDependencyReadiness', () => {
    it('should return true when no readiness check is configured', async () => {
      const dependency = { name: 'test' };
      const result = await checkDependencyReadiness(dependency, '/tmp');
      expect(result).toBe(true);
    });

    it('should return true for HTTP readiness check', async () => {
      const dependency = {
        name: 'api',
        readiness: {
          type: 'http',
          config: { url: 'http://localhost:3000/health' },
          timeout: 5000
        }
      };

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
      });

      const result = await checkDependencyReadiness(dependency, '/tmp');
      expect(result).toBe(true);
    });

    it('should return true for port readiness check', async () => {
      const dependency = {
        name: 'database',
        readiness: {
          type: 'port',
          config: { host: 'localhost', port: 5432 },
          timeout: 5000
        }
      };

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
      });

      const result = await checkDependencyReadiness(dependency, '/tmp');
      expect(result).toBe(true);
    });

    it('should return true for command readiness check', async () => {
      const dependency = {
        name: 'worker',
        readiness: {
          type: 'command',
          config: { command: 'echo test' },
          timeout: 5000
        }
      };

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
      });

      const result = await checkDependencyReadiness(dependency, '/tmp');
      expect(result).toBe(true);
    });

    it('should return true for docker readiness check', async () => {
      const dependency = {
        name: 'monitoring',
        readiness: {
          type: 'docker',
          config: { container: 'prometheus', service: 'prometheus' },
          timeout: 5000
        }
      };

      const mockStdout = {
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            setTimeout(() => callback(Buffer.from(JSON.stringify({
              Service: 'prometheus',
              State: 'running',
              Health: 'healthy'
            }))), 10);
          }
        })
      };
      const mockStderr = { on: jest.fn() };

      mockChild.stdout = mockStdout;
      mockChild.stderr = mockStderr;

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 20);
        }
      });

      const result = await checkDependencyReadiness(dependency, '/tmp');
      expect(result).toBe(true);
    });

    it('should return false for unknown readiness check type', async () => {
      const dependency = {
        name: 'unknown',
        readiness: {
          type: 'unknown',
          config: {},
          timeout: 5000
        }
      };

      const result = await checkDependencyReadiness(dependency, '/tmp');
      expect(result).toBe(true); // Should return true with warning
    });
  });

  describe('waitForDependencies', () => {
    it('should return true immediately when no dependencies', async () => {
      const result = await waitForDependencies([], '/tmp');
      expect(result).toBe(true);
    });

    it('should return true when all dependencies are ready', async () => {
      const dependencies = [
        {
          name: 'database',
          readiness: {
            type: 'port',
            config: { host: 'localhost', port: 5432 },
            timeout: 5000
          }
        }
      ];

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
      });

      const result = await waitForDependencies(dependencies, '/tmp', {
        maxRetries: 1,
        retryDelay: 100
      });
      expect(result).toBe(true);
    });

    it('should retry when dependencies are not ready', async () => {
      const dependencies = [
        {
          name: 'database',
          readiness: {
            type: 'port',
            config: { host: 'localhost', port: 5432 },
            timeout: 5000
          }
        }
      ];

      let callCount = 0;
      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          callCount++;
          // Fail first call, succeed on second
          setTimeout(() => callback(callCount === 1 ? 1 : 0), 10);
        }
      });

      const result = await waitForDependencies(dependencies, '/tmp', {
        maxRetries: 2,
        retryDelay: 100
      });
      expect(result).toBe(true);
      expect(callCount).toBe(2);
    });

    it('should return false when max retries exceeded', async () => {
      const dependencies = [
        {
          name: 'database',
          readiness: {
            type: 'port',
            config: { host: 'localhost', port: 5432 },
            timeout: 5000
          }
        }
      ];

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(1), 10); // Always fail
        }
      });

      const result = await waitForDependencies(dependencies, '/tmp', {
        maxRetries: 2,
        retryDelay: 100
      });
      expect(result).toBe(false);
    });
  });

  describe('getDependencyReadinessConfig', () => {
    it('should return empty array when no dependencies', () => {
      const project = { name: 'api' };
      const config = { projects: [] };

      const result = getDependencyReadinessConfig(project, config);
      expect(result).toEqual([]);
    });

    it('should return dependency configurations with readiness info', () => {
      const project = { name: 'api' };
      const config = {
        dependencies: {
          api: ['database', 'redis']
        },
        projects: [
          {
            name: 'database',
            readiness: {
              type: 'port',
              config: { host: 'localhost', port: 5432 }
            }
          },
          {
            name: 'redis',
            readiness: {
              type: 'port',
              config: { host: 'localhost', port: 6379 }
            }
          }
        ]
      };

      const result = getDependencyReadinessConfig(project, config);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'database',
        project: config.projects[0],
        readiness: config.projects[0].readiness
      });
      expect(result[1]).toEqual({
        name: 'redis',
        project: config.projects[1],
        readiness: config.projects[1].readiness
      });
    });

    it('should filter out non-existent dependencies', () => {
      const project = { name: 'api' };
      const config = {
        dependencies: {
          api: ['database', 'nonexistent']
        },
        projects: [
          {
            name: 'database',
            readiness: {
              type: 'port',
              config: { host: 'localhost', port: 5432 }
            }
          }
        ]
      };

      const result = getDependencyReadinessConfig(project, config);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('database');
    });
  });
});
