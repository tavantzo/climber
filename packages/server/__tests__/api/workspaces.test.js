const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const { mockConfigManager } = require('../setup');

const workspacesRouter = require('../../src/api/workspaces');

describe('Workspaces API', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(bodyParser.json());
    app.use('/api/workspaces', workspacesRouter);
    
    jest.clearAllMocks();
    mockConfigManager.listWorkspaces.mockReturnValue(['default', 'test-workspace']);
    mockConfigManager.getCurrentWorkspace.mockReturnValue('default');
  });

  describe('GET /api/workspaces', () => {
    it('should list all workspaces', async () => {
      const response = await request(app)
        .get('/api/workspaces')
        .expect(200);

      expect(response.body).toHaveProperty('current', 'default');
      expect(response.body).toHaveProperty('workspaces');
      expect(response.body.workspaces).toContain('default');
      expect(response.body.workspaces).toContain('test-workspace');
    });
  });

  describe('GET /api/workspaces/current', () => {
    it('should return current workspace with configuration', async () => {
      mockConfigManager.load.mockReturnValue(undefined);

      const response = await request(app)
        .get('/api/workspaces/current')
        .expect(200);

      expect(response.body).toHaveProperty('name', 'default');
      expect(response.body).toHaveProperty('config');
      expect(response.body.config).toHaveProperty('projects');
      expect(mockConfigManager.load).toHaveBeenCalled();
    });
  });

  describe('POST /api/workspaces/switch', () => {
    it('should switch to a different workspace', async () => {
      mockConfigManager.switchWorkspace.mockReturnValue(undefined);

      const response = await request(app)
        .post('/api/workspaces/switch')
        .send({ workspace: 'test-workspace' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('workspace', 'test-workspace');
      expect(mockConfigManager.switchWorkspace).toHaveBeenCalledWith('test-workspace');
    });

    it('should return 400 if workspace name is missing', async () => {
      const response = await request(app)
        .post('/api/workspaces/switch')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(mockConfigManager.switchWorkspace).not.toHaveBeenCalled();
    });

    it('should handle switch errors', async () => {
      mockConfigManager.switchWorkspace.mockImplementation(() => {
        throw new Error('Workspace not found');
      });

      const response = await request(app)
        .post('/api/workspaces/switch')
        .send({ workspace: 'non-existent' })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });
});

