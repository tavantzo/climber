const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const { mockConfigManager, mockExecuteGitOperation } = require('../setup');

const gitRouter = require('../../src/api/git');

describe('Git API', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(bodyParser.json());
    app.use('/api/git', gitRouter);
    
    jest.clearAllMocks();
    mockConfigManager.load.mockReturnValue(undefined);
  });

  describe('GET /api/git/status', () => {
    it('should get git status for all projects', async () => {
      mockExecuteGitOperation.mockResolvedValue({
        success: true,
        operation: 'status',
        results: [
          { project: 'test-project-1', branch: 'main', hasChanges: false }
        ]
      });

      const response = await request(app)
        .get('/api/git/status')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('operation', 'status');
      expect(mockExecuteGitOperation).toHaveBeenCalledWith(
        expect.any(Array),
        'status',
        expect.any(Object)
      );
    });

    it('should filter projects by query parameter', async () => {
      mockExecuteGitOperation.mockResolvedValue({
        success: true,
        operation: 'status',
        results: []
      });

      await request(app)
        .get('/api/git/status?projects=test-project-1,test-project-2')
        .expect(200);

      const call = mockExecuteGitOperation.mock.calls[0];
      expect(call[0]).toHaveLength(2);
    });
  });

  describe('POST /api/git/pull', () => {
    it('should pull changes for specified projects', async () => {
      mockExecuteGitOperation.mockResolvedValue({
        success: true,
        operation: 'pull',
        results: []
      });

      const response = await request(app)
        .post('/api/git/pull')
        .send({ projects: ['test-project-1'] })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(mockExecuteGitOperation).toHaveBeenCalledWith(
        expect.any(Array),
        'pull',
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should pass options to git pull', async () => {
      mockExecuteGitOperation.mockResolvedValue({ success: true, operation: 'pull', results: [] });

      await request(app)
        .post('/api/git/pull')
        .send({ 
          projects: ['test-project-1'],
          options: { rebase: true }
        })
        .expect(200);

      const call = mockExecuteGitOperation.mock.calls[0];
      expect(call[3]).toEqual({ rebase: true });
    });
  });

  describe('POST /api/git/sync', () => {
    it('should sync projects with remote', async () => {
      mockExecuteGitOperation.mockResolvedValue({
        success: true,
        operation: 'sync',
        results: []
      });

      const response = await request(app)
        .post('/api/git/sync')
        .send({ projects: ['test-project-1'] })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('operation', 'sync');
    });
  });

  it('should handle errors gracefully', async () => {
    mockExecuteGitOperation.mockRejectedValue(new Error('Git operation failed'));

    const response = await request(app)
      .get('/api/git/status')
      .expect(500);

    expect(response.body).toHaveProperty('error');
  });
});

