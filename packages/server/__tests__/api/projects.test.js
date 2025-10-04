const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const {
  mockConfigManager,
  mockDcPs,
  mockDcUpAll,
  mockDcDown,
  mockDcRestartAll
} = require('../setup');

// Import the router
const projectsRouter = require('../../src/api/projects');

describe('Projects API', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(bodyParser.json());
    app.use('/api/projects', projectsRouter);
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Set default mock implementations
    mockConfigManager.load.mockReturnValue(undefined);
    mockDcPs.mockResolvedValue({
      data: { services: [{ name: 'web', state: 'running' }] },
      out: 'Service: web, State: running'
    });
  });

  describe('GET /api/projects', () => {
    it('should return all projects with status', async () => {
      const response = await request(app)
        .get('/api/projects')
        .expect(200);

      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('workspace', 'default');
      expect(response.body).toHaveProperty('projects');
      expect(Array.isArray(response.body.projects)).toBe(true);
      expect(response.body.projects.length).toBe(2);
      expect(mockConfigManager.load).toHaveBeenCalled();
    });

    it('should include project status from docker-compose', async () => {
      const response = await request(app)
        .get('/api/projects')
        .expect(200);

      expect(response.body.projects[0]).toHaveProperty('status');
      expect(response.body.projects[0]).toHaveProperty('containers');
      expect(mockDcPs).toHaveBeenCalled();
    });

    it('should handle docker-compose errors gracefully', async () => {
      mockDcPs.mockRejectedValue(new Error('Docker not running'));

      const response = await request(app)
        .get('/api/projects')
        .expect(200);

      expect(response.body.projects[0]).toHaveProperty('status', 'stopped');
      expect(response.body.projects[0]).toHaveProperty('error');
    });
  });

  describe('GET /api/projects/:name', () => {
    it('should return a specific project', async () => {
      const response = await request(app)
        .get('/api/projects/test-project-1')
        .expect(200);

      expect(response.body).toHaveProperty('name', 'test-project-1');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('status');
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .get('/api/projects/non-existent')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Project not found');
    });

    it('should include container information', async () => {
      mockDcPs.mockResolvedValue({
        data: {
          services: [
            { name: 'web', state: 'running' },
            { name: 'db', state: 'running' }
          ]
        },
        out: 'Services running'
      });

      const response = await request(app)
        .get('/api/projects/test-project-1')
        .expect(200);

      expect(response.body.containers).toHaveLength(2);
      expect(response.body.status).toBe('running');
    });
  });

  describe('POST /api/projects/:name/start', () => {
    it('should start a project successfully', async () => {
      mockDcUpAll.mockResolvedValue({ out: 'Started' });

      const response = await request(app)
        .post('/api/projects/test-project-1/start')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(mockDcUpAll).toHaveBeenCalled();
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .post('/api/projects/non-existent/start')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Project not found');
      expect(mockDcUpAll).not.toHaveBeenCalled();
    });

    it('should handle docker-compose errors', async () => {
      mockDcUpAll.mockRejectedValue(new Error('Failed to start'));

      const response = await request(app)
        .post('/api/projects/test-project-1/start')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/projects/:name/stop', () => {
    it('should stop a project successfully', async () => {
      mockDcDown.mockResolvedValue({ out: 'Stopped' });

      const response = await request(app)
        .post('/api/projects/test-project-1/stop')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(mockDcDown).toHaveBeenCalled();
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .post('/api/projects/non-existent/stop')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Project not found');
      expect(mockDcDown).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/projects/:name/restart', () => {
    it('should restart a project successfully', async () => {
      mockDcRestartAll.mockResolvedValue({ out: 'Restarted' });

      const response = await request(app)
        .post('/api/projects/test-project-1/restart')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(mockDcRestartAll).toHaveBeenCalled();
    });
  });

  describe('POST /api/projects/bulk/start', () => {
    it('should start multiple projects', async () => {
      mockDcUpAll.mockResolvedValue({ out: 'Started' });

      const response = await request(app)
        .post('/api/projects/bulk/start')
        .send({ projects: ['test-project-1', 'test-project-2'] })
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(response.body.results).toHaveLength(2);
      expect(response.body.results[0]).toHaveProperty('success', true);
      expect(mockDcUpAll).toHaveBeenCalledTimes(2);
    });

    it('should return 400 for invalid input', async () => {
      const response = await request(app)
        .post('/api/projects/bulk/start')
        .send({ projects: 'not-an-array' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle partial failures', async () => {
      mockDcUpAll
        .mockResolvedValueOnce({ out: 'Started' })
        .mockRejectedValueOnce(new Error('Failed'));

      const response = await request(app)
        .post('/api/projects/bulk/start')
        .send({ projects: ['test-project-1', 'test-project-2'] })
        .expect(200);

      expect(response.body.results[0]).toHaveProperty('success', true);
      expect(response.body.results[1]).toHaveProperty('success', false);
    });

    it('should report non-existent projects', async () => {
      const response = await request(app)
        .post('/api/projects/bulk/start')
        .send({ projects: ['test-project-1', 'non-existent'] })
        .expect(200);

      expect(response.body.results[1]).toHaveProperty('success', false);
      expect(response.body.results[1]).toHaveProperty('error', 'Not found');
    });
  });

  describe('POST /api/projects/bulk/stop', () => {
    it('should stop multiple projects', async () => {
      mockDcDown.mockResolvedValue({ out: 'Stopped' });

      const response = await request(app)
        .post('/api/projects/bulk/stop')
        .send({ projects: ['test-project-1', 'test-project-2'] })
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(response.body.results).toHaveLength(2);
      expect(mockDcDown).toHaveBeenCalledTimes(2);
    });

    it('should return 400 for invalid input', async () => {
      const response = await request(app)
        .post('/api/projects/bulk/stop')
        .send({ projects: null })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});

