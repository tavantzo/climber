// Mock child_process
const mockExecSync = jest.fn();
const mockSpawn = jest.fn();
jest.mock('child_process', () => ({
  execSync: mockExecSync,
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
  isGitRepository,
  getGitRoot,
  getCurrentBranch,
  hasUncommittedChanges,
  getRemoteStatus,
  gitStatus,
  gitPull,
  gitSync,
  getRepositoryInfo,
  executeGitOperation
} = require('../bin/vcs');

describe('VCS', () => {
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

  describe('isGitRepository', () => {
    it('should return true for git repository', () => {
      mockExecSync.mockReturnValue('');

      const result = isGitRepository('/test/repo');

      expect(result).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        'git rev-parse --git-dir',
        expect.objectContaining({ cwd: '/test/repo' })
      );
    });

    it('should return false for non-git repository', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Not a git repository');
      });

      const result = isGitRepository('/test/not-repo');

      expect(result).toBe(false);
    });
  });

  describe('getGitRoot', () => {
    it('should return git root directory', () => {
      mockExecSync.mockReturnValue('/test/repo\n');

      const result = getGitRoot('/test/repo/subdir');

      expect(result).toBe('/test/repo');
      expect(mockExecSync).toHaveBeenCalledWith(
        'git rev-parse --show-toplevel',
        expect.objectContaining({ cwd: '/test/repo/subdir' })
      );
    });

    it('should return null for non-git repository', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Not a git repository');
      });

      const result = getGitRoot('/test/not-repo');

      expect(result).toBeNull();
    });
  });

  describe('getCurrentBranch', () => {
    it('should return current branch name', () => {
      mockExecSync.mockReturnValue('main\n');

      const result = getCurrentBranch('/test/repo');

      expect(result).toBe('main');
      expect(mockExecSync).toHaveBeenCalledWith(
        'git rev-parse --abbrev-ref HEAD',
        expect.objectContaining({ cwd: '/test/repo' })
      );
    });

    it('should return null on error', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Not a git repository');
      });

      const result = getCurrentBranch('/test/not-repo');

      expect(result).toBeNull();
    });
  });

  describe('hasUncommittedChanges', () => {
    it('should return true when there are uncommitted changes', () => {
      mockExecSync.mockReturnValue('M file.txt\n');

      const result = hasUncommittedChanges('/test/repo');

      expect(result).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        'git status --porcelain',
        expect.objectContaining({ cwd: '/test/repo' })
      );
    });

    it('should return false when working directory is clean', () => {
      mockExecSync.mockReturnValue('');

      const result = hasUncommittedChanges('/test/repo');

      expect(result).toBe(false);
    });

    it('should return false on error', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Not a git repository');
      });

      const result = hasUncommittedChanges('/test/not-repo');

      expect(result).toBe(false);
    });
  });

  describe('getRemoteStatus', () => {
    it('should return up to date status', () => {
      mockExecSync
        .mockReturnValueOnce('') // fetch dry-run
        .mockReturnValueOnce('main\n') // current branch
        .mockReturnValueOnce('') // verify remote branch
        .mockReturnValueOnce('0\t0\n'); // ahead/behind counts

      const result = getRemoteStatus('/test/repo');

      expect(result.upToDate).toBe(true);
      expect(result.branch).toBe('main');
      expect(result.behind).toBe(0);
      expect(result.ahead).toBe(0);
    });

    it('should return behind status', () => {
      mockExecSync
        .mockReturnValueOnce('') // fetch dry-run
        .mockReturnValueOnce('main\n') // current branch
        .mockReturnValueOnce('') // verify remote branch
        .mockReturnValueOnce('2\t0\n'); // behind 2, ahead 0

      const result = getRemoteStatus('/test/repo');

      expect(result.upToDate).toBe(false);
      expect(result.behind).toBe(2);
      expect(result.ahead).toBe(0);
      expect(result.canFastForward).toBe(true);
    });

    it('should return ahead status', () => {
      mockExecSync
        .mockReturnValueOnce('') // fetch dry-run
        .mockReturnValueOnce('main\n') // current branch
        .mockReturnValueOnce('') // verify remote branch
        .mockReturnValueOnce('0\t2\n'); // behind 0, ahead 2

      const result = getRemoteStatus('/test/repo');

      expect(result.upToDate).toBe(false);
      expect(result.behind).toBe(0);
      expect(result.ahead).toBe(2);
      expect(result.canFastForward).toBe(false);
    });

    it('should handle no remote branch', () => {
      mockExecSync
        .mockReturnValueOnce('') // fetch dry-run
        .mockReturnValueOnce('main\n') // current branch
        .mockImplementationOnce(() => {
          throw new Error('Remote branch does not exist');
        });

      const result = getRemoteStatus('/test/repo');

      expect(result.noRemote).toBe(true);
      expect(result.branch).toBe('main');
    });

    it('should handle errors', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Git command failed');
      });

      const result = getRemoteStatus('/test/repo');

      expect(result.error).toBeDefined();
    });
  });

  describe('gitStatus', () => {
    it('should return status for git repository', async () => {
      mockExecSync
        .mockReturnValueOnce('') // isGitRepository check
        .mockReturnValueOnce('main\n') // getCurrentBranch
        .mockReturnValueOnce('') // hasUncommittedChanges
        .mockReturnValueOnce('') // getRemoteStatus - fetch
        .mockReturnValueOnce('main\n') // getRemoteStatus - branch
        .mockReturnValueOnce('') // getRemoteStatus - verify remote
        .mockReturnValueOnce('0\t0\n'); // getRemoteStatus - counts

      const project = {
        name: 'test-project',
        path: 'test-project'
      };

      const result = await gitStatus(project, '/test/repo');

      expect(result.success).toBe(true);
      expect(result.project).toBe('test-project');
      expect(result.isGitRepo).toBe(true);
      expect(result.branch).toBe('main');
      expect(result.hasChanges).toBe(false);
      expect(result.remoteStatus.upToDate).toBe(true);
    });

    it('should handle non-git repository', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Not a git repository');
      });

      const project = {
        name: 'test-project',
        path: 'test-project'
      };

      const result = await gitStatus(project, '/test/not-repo');

      expect(result.success).toBe(true);
      expect(result.project).toBe('test-project');
      expect(result.isGitRepo).toBe(false);
    });
  });

  describe('gitPull', () => {
    it('should skip non-git repository', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Not a git repository');
      });

      const project = {
        name: 'test-project',
        path: 'test-project'
      };

      const result = await gitPull(project, '/test/not-repo');

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.isGitRepo).toBe(false);
    });

    it('should skip when already up to date', async () => {
      mockExecSync
        .mockReturnValueOnce('') // isGitRepository
        .mockReturnValueOnce('') // hasUncommittedChanges
        .mockReturnValueOnce('') // getRemoteStatus - fetch
        .mockReturnValueOnce('main\n') // getRemoteStatus - branch
        .mockReturnValueOnce('') // getRemoteStatus - verify remote
        .mockReturnValueOnce('0\t0\n'); // getRemoteStatus - up to date

      const project = {
        name: 'test-project',
        path: 'test-project'
      };

      const result = await gitPull(project, '/test/repo');

      expect(result.success).toBe(true);
      expect(result.upToDate).toBe(true);
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it('should fail when uncommitted changes detected', async () => {
      mockExecSync
        .mockReturnValueOnce('') // isGitRepository
        .mockReturnValueOnce('M file.txt\n') // hasUncommittedChanges - has changes
        .mockReturnValueOnce('') // getRemoteStatus - fetch
        .mockReturnValueOnce('main\n') // getRemoteStatus - branch
        .mockReturnValueOnce('') // getRemoteStatus - verify remote
        .mockReturnValueOnce('2\t0\n'); // getRemoteStatus - behind

      const project = {
        name: 'test-project',
        path: 'test-project'
      };

      const result = await gitPull(project, '/test/repo');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Uncommitted changes');
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it('should fail when local commits would create merge', async () => {
      mockExecSync
        .mockReturnValueOnce('') // isGitRepository
        .mockReturnValueOnce('') // hasUncommittedChanges - clean
        .mockReturnValueOnce('') // getRemoteStatus - fetch
        .mockReturnValueOnce('main\n') // getRemoteStatus - branch
        .mockReturnValueOnce('') // getRemoteStatus - verify remote
        .mockReturnValueOnce('2\t2\n'); // getRemoteStatus - behind and ahead

      const project = {
        name: 'test-project',
        path: 'test-project'
      };

      const result = await gitPull(project, '/test/repo');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Local commits');
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it('should pull successfully', async () => {
      mockExecSync
        .mockReturnValueOnce('') // isGitRepository
        .mockReturnValueOnce('') // hasUncommittedChanges
        .mockReturnValueOnce('') // getRemoteStatus - fetch
        .mockReturnValueOnce('main\n') // getRemoteStatus - branch
        .mockReturnValueOnce('') // getRemoteStatus - verify remote
        .mockReturnValueOnce('2\t0\n'); // getRemoteStatus - behind

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
      });

      const project = {
        name: 'test-project',
        path: 'test-project'
      };

      const result = await gitPull(project, '/test/repo');

      expect(result.success).toBe(true);
      expect(result.project).toBe('test-project');
      expect(mockSpawn).toHaveBeenCalledWith(
        'git',
        ['pull'],
        expect.objectContaining({ cwd: '/test/repo' })
      );
    });

    it('should pull with rebase option', async () => {
      mockExecSync
        .mockReturnValueOnce('') // isGitRepository
        .mockReturnValueOnce('') // hasUncommittedChanges
        .mockReturnValueOnce('') // getRemoteStatus - fetch
        .mockReturnValueOnce('main\n') // getRemoteStatus - branch
        .mockReturnValueOnce('') // getRemoteStatus - verify remote
        .mockReturnValueOnce('2\t2\n'); // getRemoteStatus - behind and ahead

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
      });

      const project = {
        name: 'test-project',
        path: 'test-project'
      };

      const result = await gitPull(project, '/test/repo', { rebase: true });

      expect(result.success).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith(
        'git',
        ['pull', '--rebase'],
        expect.any(Object)
      );
    });
  });

  describe('gitSync', () => {
    it('should skip non-git repository', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Not a git repository');
      });

      const project = {
        name: 'test-project',
        path: 'test-project'
      };

      const result = await gitSync(project, '/test/not-repo');

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.isGitRepo).toBe(false);
    });

    it('should fetch successfully', async () => {
      mockExecSync
        .mockReturnValueOnce('') // isGitRepository
        .mockReturnValueOnce('') // fetch
        .mockReturnValueOnce('') // getRemoteStatus - fetch dry-run
        .mockReturnValueOnce('main\n') // getRemoteStatus - branch
        .mockReturnValueOnce('') // getRemoteStatus - verify remote
        .mockReturnValueOnce('0\t0\n') // getRemoteStatus - up to date
        .mockReturnValueOnce(''); // hasUncommittedChanges

      const project = {
        name: 'test-project',
        path: 'test-project'
      };

      const result = await gitSync(project, '/test/repo');

      expect(result.success).toBe(true);
      expect(result.fetched).toBe(true);
      expect(result.upToDate).toBe(true);
    });

    it('should skip pull when uncommitted changes', async () => {
      mockExecSync
        .mockReturnValueOnce('') // isGitRepository
        .mockReturnValueOnce('') // fetch
        .mockReturnValueOnce('') // getRemoteStatus - fetch dry-run
        .mockReturnValueOnce('main\n') // getRemoteStatus - branch
        .mockReturnValueOnce('') // getRemoteStatus - verify remote
        .mockReturnValueOnce('2\t0\n') // getRemoteStatus - behind
        .mockReturnValueOnce('M file.txt\n'); // hasUncommittedChanges - has changes

      const project = {
        name: 'test-project',
        path: 'test-project'
      };

      const result = await gitSync(project, '/test/repo');

      expect(result.success).toBe(true);
      expect(result.fetched).toBe(true);
      expect(result.pulled).toBe(false);
      expect(result.reason).toContain('Uncommitted');
    });
  });

  describe('getRepositoryInfo', () => {
    it('should return repository info', () => {
      mockExecSync
        .mockReturnValueOnce('') // isGitRepository
        .mockReturnValueOnce('/test/repo\n') // getGitRoot
        .mockReturnValueOnce('main\n') // getCurrentBranch
        .mockReturnValueOnce('') // hasUncommittedChanges
        .mockReturnValueOnce('') // getRemoteStatus - fetch
        .mockReturnValueOnce('main\n') // getRemoteStatus - branch
        .mockReturnValueOnce('') // getRemoteStatus - verify remote
        .mockReturnValueOnce('0\t0\n'); // getRemoteStatus - counts

      const project = {
        name: 'test-project',
        path: 'test-project'
      };

      const result = getRepositoryInfo(project, '/test/repo');

      expect(result.success).toBe(true);
      expect(result.isGitRepo).toBe(true);
      expect(result.gitRoot).toBe('/test/repo');
      expect(result.branch).toBe('main');
    });

    it('should handle non-git repository', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Not a git repository');
      });

      const project = {
        name: 'test-project',
        path: 'test-project'
      };

      const result = getRepositoryInfo(project, '/test/not-repo');

      expect(result.success).toBe(false);
      expect(result.isGitRepo).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('executeGitOperation', () => {
    it('should execute git status for multiple projects', async () => {
      const projects = [
        { name: 'project1', path: 'project1' },
        { name: 'project2', path: 'project2' }
      ];

      const config = {
        root: '/test/root'
      };

      mockExecSync.mockReturnValue('');

      const result = await executeGitOperation(projects, 'status', config);

      expect(result.success).toBe(true);
      expect(result.operation).toBe('status');
      expect(result.results.length).toBeGreaterThan(0);
    });

    it('should throw error for unknown operation', async () => {
      const projects = [
        { name: 'project1', path: 'project1' }
      ];

      const config = {
        root: '/test/root'
      };

      await expect(
        executeGitOperation(projects, 'unknown-operation', config)
      ).rejects.toThrow('Unknown git operation');
    });
  });
});

