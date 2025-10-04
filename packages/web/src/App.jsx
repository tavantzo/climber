import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import './App.css';

function App() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [workspace, setWorkspace] = useState('default');
  const [socket, setSocket] = useState(null);

  // Connect to WebSocket
  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('connected', (data) => {
      console.log('Connected to server:', data);
    });

    newSocket.on('projects:status', (data) => {
      console.log('Projects status update:', data);
      setProjects(data);
    });

    return () => newSocket.close();
  }, []);

  // Fetch projects
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/projects');
      setProjects(response.data.projects);
      setWorkspace(response.data.workspace);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startProject = async (projectName) => {
    try {
      await axios.post(`/api/projects/${projectName}/start`);
      fetchProjects();
    } catch (err) {
      alert(`Failed to start ${projectName}: ${err.message}`);
    }
  };

  const stopProject = async (projectName) => {
    try {
      await axios.post(`/api/projects/${projectName}/stop`);
      fetchProjects();
    } catch (err) {
      alert(`Failed to stop ${projectName}: ${err.message}`);
    }
  };

  const restartProject = async (projectName) => {
    try {
      await axios.post(`/api/projects/${projectName}/restart`);
      fetchProjects();
    } catch (err) {
      alert(`Failed to restart ${projectName}: ${err.message}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running':
        return 'status-running';
      case 'stopped':
        return 'status-stopped';
      default:
        return 'status-unknown';
    }
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading projects...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="error">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={fetchProjects}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>🏔️ Mountain Climber</h1>
          <div className="workspace-badge">
            <span className="workspace-label">Workspace:</span>
            <span className="workspace-name">{workspace}</span>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="projects-header">
          <h2>Projects</h2>
          <button onClick={fetchProjects} className="btn-refresh">
            Refresh
          </button>
        </div>

        <div className="projects-grid">
          {projects.length === 0 ? (
            <div className="empty-state">
              <p>No projects found</p>
              <p className="empty-hint">Run <code>climb init</code> to set up your projects</p>
            </div>
          ) : (
            projects.map((project) => (
              <div key={project.name} className="project-card">
                <div className="project-header">
                  <h3>{project.name}</h3>
                  <span className={`status-badge ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                </div>

                {project.description && (
                  <p className="project-description">{project.description}</p>
                )}

                <div className="project-info">
                  <div className="info-item">
                    <span className="info-label">Path:</span>
                    <span className="info-value">{project.path}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Containers:</span>
                    <span className="info-value">
                      {project.containers?.length || 0}
                    </span>
                  </div>
                </div>

                <div className="project-actions">
                  <button
                    onClick={() => startProject(project.name)}
                    className="btn btn-start"
                    disabled={project.status === 'running'}
                  >
                    ▶ Start
                  </button>
                  <button
                    onClick={() => stopProject(project.name)}
                    className="btn btn-stop"
                    disabled={project.status === 'stopped'}
                  >
                    ■ Stop
                  </button>
                  <button
                    onClick={() => restartProject(project.name)}
                    className="btn btn-restart"
                  >
                    ⟳ Restart
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <footer className="footer">
        <p>Mountain Climber Dashboard • v2.3.0</p>
      </footer>
    </div>
  );
}

export default App;

