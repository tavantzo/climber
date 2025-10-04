const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const {
  mockConfigManager,
  mockExecuteHookForProjects,
  mockStandardHooks
} = require('../setup');

const hooksRouter = require('../../src/api/hooks');

describe('Hooks API', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(bodyParser.json());
    app.use('/api/hooks', hooksRouter);
    
    jest.clearAllMocks();
    mockConfigManager.load.mockReturnValue(undefined);
  });

  describe('GET /api/hooks', () => {
    it('should return all available hooks', async () => {
      const response = await request(app)
        .get('/api/hooks')
        .expect(200);

      expect(response.body).toHaveProperty('standard');
      expect(response.body).toHaveProperty('global');
      expect(response.body).toHaveProperty('customCommands');
      expect(response.body).toHaveProperty('projects');
      expect(mockConfigManager.load).toHaveBeenCalled();
    });

    it('should include standard hooks', async () => {
      const response = await request(app)
        .get('/api/hooks')
        .expect(200);

      expect(response.body.standard).toEqual(mockStandardHooks);
      expect(response.body.standard).toHaveProperty('INSTALL_DEPS');
      expect(response.body.standard).toHaveProperty('TEST');
    });

    it('should include global hooks from config', async () => {
      const response = await request(app)
        .get('/api/hooks')
        .expect(200);

      expect(response.body.global).toHaveProperty('install-deps');
      expect(response.body.global['install-deps']).toHaveProperty('command', 'npm install');
    });

    it('should include custom commands', async () => {
      const response = await request(app)
        .get('/api/hooks')
        .expect(200);

      expect(response.body.customCommands).toHaveProperty('bundle-install');
    });

    it('should include project-specific hooks', async () => {
      const response = await request(app)
        .get('/api/hooks')
        .expect(200);

      expect(response.body.projects).toHaveLength(1);
      expect(response.body.projects[0]).toHaveProperty('name', 'test-project-2');
      expect(response.body.projects[0]).toHaveProperty('hooks');
      expect(response.body.projects[0].hooks).toHaveProperty('test');
    });

    it('should handle configuration errors', async () => {
      mockConfigManager.load.mockImplementation(() => {
        throw new Error('Config not found');
      });

      const response = await request(app)
        .get('/api/hooks')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/hooks/execute', () => {
    it('should execute a hook on all projects', async () => {
      mockExecuteHookForProjects.mockResolvedValue({
        success: true,
        hook: 'install-deps',
        results: [
          { project: 'test-project-1', success: true },
          { project: 'test-project-2', success: true }
        ]
      });

      const response = await request(app)
        .post('/api/hooks/execute')
        .send({ hookName: 'install-deps' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('hook', 'install-deps');
      expect(response.body).toHaveProperty('results');
      expect(mockExecuteHookForProjects).toHaveBeenCalled();
    });

    it('should execute a hook on specific projects', async () => {
      mockExecuteHookForProjects.mockResolvedValue({
        success: true,
        hook: 'test',
        results: [{ project: 'test-project-1', success: true }]
      });

      const response = await request(app)
        .post('/api/hooks/execute')
        .send({ 
          hookName: 'test',
          projects: ['test-project-1']
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(mockExecuteHookForProjects).toHaveBeenCalled();
      
      // Verify correct projects were passed
      const call = mockExecuteHookForProjects.mock.calls[0];
      expect(call[0]).toHaveLength(1);
      expect(call[0][0].name).toBe('test-project-1');
    });

    it('should return 400 if hookName is missing', async () => {
      const response = await request(app)
        .post('/api/hooks/execute')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'hookName is required');
      expect(mockExecuteHookForProjects).not.toHaveBeenCalled();
    });

    it('should pass options to hook execution', async () => {
      mockExecuteHookForProjects.mockResolvedValue({
        success: true,
        hook: 'test',
        results: []
      });

      const response = await request(app)
        .post('/api/hooks/execute')
        .send({
          hookName: 'test',
          options: { parallel: true, interactive: false }
        })
        .expect(200);

      expect(mockExecuteHookForProjects).toHaveBeenCalled();
      const call = mockExecuteHookForProjects.mock.calls[0];
      expect(call[3]).toEqual({ parallel: true, interactive: false });
    });

    it('should handle hook execution failures', async () => {
      mockExecuteHookForProjects.mockResolvedValue({
        success: false,
        hook: 'test',
        results: [
          { project: 'test-project-1', success: false, error: 'Tests failed' }
        ]
      });

      const response = await request(app)
        .post('/api/hooks/execute')
        .send({ hookName: 'test' })
        .expect(200);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.results[0]).toHaveProperty('error');
    });

    it('should handle execution errors', async () => {
      mockExecuteHookForProjects.mockRejectedValue(new Error('Execution failed'));

      const response = await request(app)
        .post('/api/hooks/execute')
        .send({ hookName: 'test' })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });
});

