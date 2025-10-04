const request = require('supertest');
const express = require('express');
const { mockConfigManager, mockDcLogs } = require('../setup');

const logsRouter = require('../../src/api/logs');

describe('Logs API', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use('/api/logs', logsRouter);
    
    jest.clearAllMocks();
    mockConfigManager.load.mockReturnValue(undefined);
    mockDcLogs.mockResolvedValue({
      out: 'Log line 1\nLog line 2\nLog line 3'
    });
  });

  describe('GET /api/logs/:project', () => {
    it('should return logs for a project', async () => {
      const response = await request(app)
        .get('/api/logs/test-project-1')
        .expect(200);

      expect(response.body).toHaveProperty('project', 'test-project-1');
      expect(response.body).toHaveProperty('logs');
      expect(typeof response.body.logs).toBe('string');
      expect(mockDcLogs).toHaveBeenCalled();
    });

    it('should accept tail parameter', async () => {
      await request(app)
        .get('/api/logs/test-project-1?tail=50')
        .expect(200);

      const call = mockDcLogs.mock.calls[0];
      expect(call[1].commandOptions).toContain('--tail');
      expect(call[1].commandOptions).toContain('50');
    });

    it('should accept service parameter', async () => {
      await request(app)
        .get('/api/logs/test-project-1?service=web')
        .expect(200);

      const call = mockDcLogs.mock.calls[0];
      expect(call[1].commandOptions).toContain('web');
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .get('/api/logs/non-existent')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Project not found');
      expect(mockDcLogs).not.toHaveBeenCalled();
    });

    it('should handle docker-compose errors', async () => {
      mockDcLogs.mockRejectedValue(new Error('Failed to get logs'));

      const response = await request(app)
        .get('/api/logs/test-project-1')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });
});

