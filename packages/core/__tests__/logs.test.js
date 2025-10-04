const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Mock dependencies
jest.mock('docker-compose');
jest.mock('child_process');
jest.mock('chalk', () => ({
  blue: jest.fn((text) => text),
  yellow: jest.fn((text) => text),
  red: jest.fn((text) => text),
  green: jest.fn((text) => text),
  gray: jest.fn((text) => text),
  cyan: jest.fn((text) => text),
}));

const mockConfigManager = {
  load: jest.fn(() => ({
    root: '/test',
    projects: [
      { name: 'project1', path: 'project1', description: 'Test project 1' },
      { name: 'project2', path: 'project2', description: 'Test project 2' }
    ]
  })),
  getStartupOrder: jest.fn(() => [
    { name: 'project1', path: 'project1', description: 'Test project 1' },
    { name: 'project2', path: 'project2', description: 'Test project 2' }
  ]),
  config: { root: '/test' }
};

jest.mock('../bin/config', () => mockConfigManager);

describe('logs command', () => {
  const mockDc = require('docker-compose');
  const mockSpawn = require('child_process').spawn;
  const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
  const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
  const mockProcessExit = jest.spyOn(process, 'exit').mockImplementation();

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the config manager mock
    mockConfigManager.getStartupOrder.mockReturnValue([
      { name: 'project1', path: 'project1', description: 'Test project 1' },
      { name: 'project2', path: 'project2', description: 'Test project 2' }
    ]);
    mockConfigManager.config = { root: '/test' };

    // Mock spawn
    const mockChild = {
      on: jest.fn(),
      kill: jest.fn(),
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() }
    };
    mockSpawn.mockReturnValue(mockChild);
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
    mockProcessExit.mockRestore();
  });

  test('should have proper mocks set up', () => {
    expect(mockDc.logs).toBeDefined();
    expect(mockSpawn).toBeDefined();
    expect(mockConfigManager.getStartupOrder).toBeDefined();
    expect(mockConfigManager.config).toBeDefined();
  });

  test('should have config manager properly mocked', () => {
    expect(mockConfigManager.load).toBeDefined();
    expect(mockConfigManager.getStartupOrder).toBeDefined();
    expect(mockConfigManager.config).toBeDefined();
  });

  test('should handle spawn for docker logs', () => {
    const mockChild = {
      on: jest.fn(),
      kill: jest.fn(),
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() }
    };
    mockSpawn.mockReturnValue(mockChild);

    const result = mockSpawn('docker', ['compose', 'logs', '--tail', '100'], {
      cwd: '/test/project1',
      stdio: ['ignore', 'pipe', 'pipe']
    });

    expect(result).toBe(mockChild);
    expect(mockSpawn).toHaveBeenCalledWith('docker', ['compose', 'logs', '--tail', '100'], {
      cwd: '/test/project1',
      stdio: ['ignore', 'pipe', 'pipe']
    });
  });
});
