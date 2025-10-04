import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { io } from 'socket.io-client';
import App from './App';

// Mock data
const mockProjects = [
  {
    name: 'test-project-1',
    description: 'Test project 1',
    path: 'project1',
    status: 'running',
    containers: [
      { name: 'web', state: 'running' },
      { name: 'db', state: 'running' }
    ]
  },
  {
    name: 'test-project-2',
    description: 'Test project 2',
    path: 'project2',
    status: 'stopped',
    containers: []
  }
];

describe('App Component', () => {
  let mockSocket;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup socket mock
    mockSocket = {
      on: vi.fn(),
      emit: vi.fn(),
      close: vi.fn(),
      connected: true
    };

    io.mockReturnValue(mockSocket);

    // Setup axios mock
    axios.get.mockResolvedValue({
      data: {
        projects: mockProjects,
        workspace: 'default',
        environment: 'development'
      }
    });
  });

  describe('Initial Render', () => {
    it('should render app with loading state', () => {
      render(<App />);
      expect(screen.getByText(/loading projects/i)).toBeInTheDocument();
    });

    it('should show spinner while loading', () => {
      render(<App />);
      expect(document.querySelector('.spinner')).toBeInTheDocument();
    });
  });

  describe('Projects Display', () => {
    it('should fetch and display projects', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('test-project-1')).toBeInTheDocument();
        expect(screen.getByText('test-project-2')).toBeInTheDocument();
      });

      expect(axios.get).toHaveBeenCalledWith('/api/projects');
    });

    it('should display project descriptions', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Test project 1')).toBeInTheDocument();
        expect(screen.getByText('Test project 2')).toBeInTheDocument();
      });
    });

    it('should display project paths', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/project1/)).toBeInTheDocument();
        expect(screen.getByText(/project2/)).toBeInTheDocument();
      });
    });

    it('should display container counts', async () => {
      render(<App />);

      await waitFor(() => {
        const project1Card = screen.getByText('test-project-1').closest('.project-card');
        expect(within(project1Card).getByText('2')).toBeInTheDocument();
      });
    });

    it('should display correct status badges', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('running')).toBeInTheDocument();
        expect(screen.getByText('stopped')).toBeInTheDocument();
      });
    });

    it('should apply correct status badge classes', async () => {
      render(<App />);

      await waitFor(() => {
        const runningBadge = screen.getByText('running');
        const stoppedBadge = screen.getByText('stopped');

        expect(runningBadge).toHaveClass('status-running');
        expect(stoppedBadge).toHaveClass('status-stopped');
      });
    });
  });

  describe('Header', () => {
    it('should display app title', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('🏔️ Mountain Climber')).toBeInTheDocument();
      });
    });

    it('should display workspace badge', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Workspace:')).toBeInTheDocument();
        expect(screen.getByText('default')).toBeInTheDocument();
      });
    });

    it('should display refresh button', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });
    });
  });

  describe('Project Controls', () => {
    it('should display start/stop/restart buttons for each project', async () => {
      render(<App />);

      await waitFor(() => {
        const project1 = screen.getByText('test-project-1').closest('.project-card');
        
        expect(within(project1).getByRole('button', { name: /▶ start/i })).toBeInTheDocument();
        expect(within(project1).getByRole('button', { name: /■ stop/i })).toBeInTheDocument();
        expect(within(project1).getByRole('button', { name: /⟳ restart/i })).toBeInTheDocument();
      });
    });

    it('should disable start button for running projects', async () => {
      render(<App />);

      await waitFor(() => {
        const project1 = screen.getByText('test-project-1').closest('.project-card');
        const startButton = within(project1).getByRole('button', { name: /▶ start/i });
        
        expect(startButton).toBeDisabled();
      });
    });

    it('should disable stop button for stopped projects', async () => {
      render(<App />);

      await waitFor(() => {
        const project2 = screen.getByText('test-project-2').closest('.project-card');
        const stopButton = within(project2).getByRole('button', { name: /■ stop/i });
        
        expect(stopButton).toBeDisabled();
      });
    });

    it('should call API when start button is clicked', async () => {
      axios.post.mockResolvedValue({ data: { success: true } });
      const user = userEvent.setup();

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('test-project-2')).toBeInTheDocument();
      });

      const project2 = screen.getByText('test-project-2').closest('.project-card');
      const startButton = within(project2).getByRole('button', { name: /▶ start/i });

      await user.click(startButton);

      expect(axios.post).toHaveBeenCalledWith('/api/projects/test-project-2/start');
    });

    it('should call API when stop button is clicked', async () => {
      axios.post.mockResolvedValue({ data: { success: true } });
      const user = userEvent.setup();

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('test-project-1')).toBeInTheDocument();
      });

      const project1 = screen.getByText('test-project-1').closest('.project-card');
      const stopButton = within(project1).getByText(/stop/i);

      await user.click(stopButton);

      expect(axios.post).toHaveBeenCalledWith('/api/projects/test-project-1/stop');
    });

    it('should call API when restart button is clicked', async () => {
      axios.post.mockResolvedValue({ data: { success: true } });
      const user = userEvent.setup();

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('test-project-1')).toBeInTheDocument();
      });

      const project1 = screen.getByText('test-project-1').closest('.project-card');
      const restartButton = within(project1).getByText(/restart/i);

      await user.click(restartButton);

      expect(axios.post).toHaveBeenCalledWith('/api/projects/test-project-1/restart');
    });

    it('should refresh projects after start action', async () => {
      axios.post.mockResolvedValue({ data: { success: true } });
      const user = userEvent.setup();

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('test-project-2')).toBeInTheDocument();
      });

      const initialCallCount = axios.get.mock.calls.length;

      const project2 = screen.getByText('test-project-2').closest('.project-card');
      const startButton = within(project2).getByRole('button', { name: /▶ start/i });

      await user.click(startButton);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(initialCallCount + 1);
      });
    });

    it('should show alert on action failure', async () => {
      axios.post.mockRejectedValue(new Error('Failed to start'));
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const user = userEvent.setup();

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('test-project-2')).toBeInTheDocument();
      });

      const project2 = screen.getByText('test-project-2').closest('.project-card');
      const startButton = within(project2).getByRole('button', { name: /▶ start/i });

      await user.click(startButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalled();
      });

      alertSpy.mockRestore();
    });
  });

  describe('Refresh Functionality', () => {
    it('should refresh projects when refresh button is clicked', async () => {
      const user = userEvent.setup();

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('test-project-1')).toBeInTheDocument();
      });

      const initialCallCount = axios.get.mock.calls.length;
      const refreshButton = screen.getByText('Refresh');

      await user.click(refreshButton);

      expect(axios.get).toHaveBeenCalledTimes(initialCallCount + 1);
    });
  });

  describe('WebSocket Integration', () => {
    it('should connect to WebSocket on mount', () => {
      render(<App />);

      expect(io).toHaveBeenCalledWith('http://localhost:3001');
    });

    it('should listen for connected event', () => {
      render(<App />);

      expect(mockSocket.on).toHaveBeenCalledWith('connected', expect.any(Function));
    });

    it('should listen for projects:status event', () => {
      render(<App />);

      expect(mockSocket.on).toHaveBeenCalledWith('projects:status', expect.any(Function));
    });

    it('should update projects on WebSocket message', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('test-project-1')).toBeInTheDocument();
      });

      // Simulate WebSocket update
      const statusHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'projects:status'
      )[1];

      const updatedProjects = [
        { ...mockProjects[0], status: 'stopped' },
        mockProjects[1]
      ];

      statusHandler(updatedProjects);

      await waitFor(() => {
        const badges = screen.getAllByText('stopped');
        expect(badges).toHaveLength(2);
      });
    });

    it('should close WebSocket on unmount', () => {
      const { unmount } = render(<App />);

      unmount();

      expect(mockSocket.close).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should display error message on fetch failure', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });
    });

    it('should display retry button on error', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should retry fetch when retry button is clicked', async () => {
      axios.get.mockRejectedValueOnce(new Error('Network error'));
      axios.get.mockResolvedValueOnce({
        data: { projects: mockProjects, workspace: 'default' }
      });

      const user = userEvent.setup();

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Retry');
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('test-project-1')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no projects', async () => {
      axios.get.mockResolvedValue({
        data: { projects: [], workspace: 'default' }
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('No projects found')).toBeInTheDocument();
      });
    });

    it('should display helpful hint in empty state', async () => {
      axios.get.mockResolvedValue({
        data: { projects: [], workspace: 'default' }
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/climb init/i)).toBeInTheDocument();
      });
    });
  });

  describe('Footer', () => {
    it('should display footer with version', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Mountain Climber Dashboard/i)).toBeInTheDocument();
        expect(screen.getByText(/v2.3.0/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible buttons', async () => {
      render(<App />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
      });
    });

    it('should have proper heading structure', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
      });
    });
  });
});

