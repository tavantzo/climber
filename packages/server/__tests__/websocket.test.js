const setupWebSocket = require('../src/websocket');
const { mockConfigManager, mockDcPs, mockDcLogs, mockFolders } = require('./setup');

describe('WebSocket Server', () => {
  let mockIo;
  let mockSocket;
  let emitCallback;
  let onCallbacks;

  beforeEach(() => {
    // Mock socket
    mockSocket = {
      id: 'test-socket-id',
      emit: jest.fn(),
      on: jest.fn((event, callback) => {
        onCallbacks[event] = callback;
      })
    };

    onCallbacks = {};

    // Mock io
    mockIo = {
      on: jest.fn((event, callback) => {
        if (event === 'connection') {
          emitCallback = callback;
        }
      })
    };

    jest.clearAllMocks();
    mockConfigManager.load.mockReturnValue(undefined);
    mockDcPs.mockResolvedValue({
      data: { services: [{ name: 'web', state: 'running' }] },
      out: 'running'
    });
  });

  it('should set up connection handler', () => {
    setupWebSocket(mockIo);
    
    expect(mockIo.on).toHaveBeenCalledWith('connection', expect.any(Function));
  });

  it('should emit connected message on connection', () => {
    setupWebSocket(mockIo);
    emitCallback(mockSocket);

    expect(mockSocket.emit).toHaveBeenCalledWith('connected', expect.objectContaining({
      message: 'Connected to Mountain Climber server'
    }));
  });

  it('should handle subscribe:projects event', async () => {
    setupWebSocket(mockIo);
    emitCallback(mockSocket);

    // Trigger subscribe event
    await onCallbacks['subscribe:projects']();

    expect(mockConfigManager.load).toHaveBeenCalled();
    expect(mockFolders.getProjects).toHaveBeenCalled();
    expect(mockSocket.emit).toHaveBeenCalledWith('projects:status', expect.any(Array));
  });

  it('should emit error on subscribe failure', async () => {
    mockConfigManager.load.mockImplementation(() => {
      throw new Error('Config error');
    });

    setupWebSocket(mockIo);
    emitCallback(mockSocket);

    await onCallbacks['subscribe:projects']();

    expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
      message: expect.any(String)
    }));
  });

  it('should handle subscribe:logs event', async () => {
    mockDcLogs.mockResolvedValue({
      out: 'Test logs\nMore logs'
    });

    setupWebSocket(mockIo);
    emitCallback(mockSocket);

    await onCallbacks['subscribe:logs']({ project: 'test-project-1' });

    expect(mockConfigManager.load).toHaveBeenCalled();
    expect(mockSocket.emit).toHaveBeenCalledWith('logs:data', expect.objectContaining({
      project: 'test-project-1'
    }));
  });

  it('should handle subscribe:logs for non-existent project', async () => {
    setupWebSocket(mockIo);
    emitCallback(mockSocket);

    await onCallbacks['subscribe:logs']({ project: 'non-existent' });

    expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
      message: 'Project not found'
    }));
  });
});

