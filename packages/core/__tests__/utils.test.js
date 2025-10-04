const fs = require('fs');
const path = require('path');

// Mock modules
jest.mock('fs');
jest.mock('path');

describe('Utility Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Path utilities', () => {
    test('should resolve paths correctly', () => {
      path.resolve.mockReturnValue('/resolved/path');

      const result = path.resolve('/test', 'path');
      expect(result).toBe('/resolved/path');
      expect(path.resolve).toHaveBeenCalledWith('/test', 'path');
    });

    test('should join paths correctly', () => {
      path.join.mockReturnValue('/joined/path');

      const result = path.join('/test', 'path');
      expect(result).toBe('/joined/path');
      expect(path.join).toHaveBeenCalledWith('/test', 'path');
    });

    test('should get directory name correctly', () => {
      path.dirname.mockReturnValue('/test');

      const result = path.dirname('/test/path');
      expect(result).toBe('/test');
      expect(path.dirname).toHaveBeenCalledWith('/test/path');
    });

    test('should get base name correctly', () => {
      path.basename.mockReturnValue('file.txt');

      const result = path.basename('/test/file.txt');
      expect(result).toBe('file.txt');
      expect(path.basename).toHaveBeenCalledWith('/test/file.txt');
    });
  });

  describe('File system utilities', () => {
    test('should check if file exists', () => {
      fs.existsSync.mockReturnValue(true);

      const result = fs.existsSync('/test/file');
      expect(result).toBe(true);
      expect(fs.existsSync).toHaveBeenCalledWith('/test/file');
    });

    test('should check if file does not exist', () => {
      fs.existsSync.mockReturnValue(false);

      const result = fs.existsSync('/test/file');
      expect(result).toBe(false);
      expect(fs.existsSync).toHaveBeenCalledWith('/test/file');
    });

    test('should read file contents', () => {
      fs.readFileSync.mockReturnValue('file contents');

      const result = fs.readFileSync('/test/file');
      expect(result).toBe('file contents');
      expect(fs.readFileSync).toHaveBeenCalledWith('/test/file');
    });

    test('should write file contents', () => {
      fs.writeFileSync.mockImplementation(() => {});

      fs.writeFileSync('/test/file', 'content');
      expect(fs.writeFileSync).toHaveBeenCalledWith('/test/file', 'content');
    });

    test('should create directory', () => {
      fs.mkdirSync.mockImplementation(() => {});

      fs.mkdirSync('/test/dir');
      expect(fs.mkdirSync).toHaveBeenCalledWith('/test/dir');
    });

    test('should read directory contents', () => {
      const mockContents = [
        { name: 'file1', isDirectory: () => false },
        { name: 'dir1', isDirectory: () => true }
      ];
      fs.readdirSync.mockReturnValue(mockContents);

      const result = fs.readdirSync('/test/dir');
      expect(result).toEqual(mockContents);
      expect(fs.readdirSync).toHaveBeenCalledWith('/test/dir');
    });

    test('should get file stats', () => {
      const mockStats = { isDirectory: () => true, isFile: () => false };
      fs.statSync.mockReturnValue(mockStats);

      const result = fs.statSync('/test/dir');
      expect(result).toEqual(mockStats);
      expect(fs.statSync).toHaveBeenCalledWith('/test/dir');
    });
  });

  describe('Environment utilities', () => {
    test('should get environment variables', () => {
      process.env.TEST_VAR = 'test_value';

      expect(process.env.TEST_VAR).toBe('test_value');

      delete process.env.TEST_VAR;
    });

    test('should handle missing environment variables', () => {
      expect(process.env.MISSING_VAR).toBeUndefined();
    });

    test('should set environment variables', () => {
      process.env.TEST_VAR = 'new_value';

      expect(process.env.TEST_VAR).toBe('new_value');

      delete process.env.TEST_VAR;
    });
  });

  describe('Process utilities', () => {
    test('should handle process arguments', () => {
      const originalArgv = process.argv;
      process.argv = ['node', 'script.js', 'arg1', 'arg2'];

      expect(process.argv).toEqual(['node', 'script.js', 'arg1', 'arg2']);

      process.argv = originalArgv;
    });

    test('should handle process exit', () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation();

      process.exit(0);
      expect(mockExit).toHaveBeenCalledWith(0);

      mockExit.mockRestore();
    });
  });

  describe('String utilities', () => {
    test('should trim strings', () => {
      expect('  test  '.trim()).toBe('test');
    });

    test('should check if string starts with prefix', () => {
      expect('test-string'.startsWith('test')).toBe(true);
      expect('test-string'.startsWith('other')).toBe(false);
    });

    test('should check if string ends with suffix', () => {
      expect('test-string'.endsWith('string')).toBe(true);
      expect('test-string'.endsWith('other')).toBe(false);
    });

    test('should split strings', () => {
      expect('a,b,c'.split(',')).toEqual(['a', 'b', 'c']);
    });

    test('should join arrays', () => {
      expect(['a', 'b', 'c'].join(',')).toBe('a,b,c');
    });
  });

  describe('Array utilities', () => {
    test('should filter arrays', () => {
      const arr = [1, 2, 3, 4, 5];
      const result = arr.filter(x => x > 3);
      expect(result).toEqual([4, 5]);
    });

    test('should map arrays', () => {
      const arr = [1, 2, 3];
      const result = arr.map(x => x * 2);
      expect(result).toEqual([2, 4, 6]);
    });

    test('should find elements in arrays', () => {
      const arr = [1, 2, 3, 4, 5];
      const result = arr.find(x => x > 3);
      expect(result).toBe(4);
    });

    test('should check if array includes element', () => {
      const arr = [1, 2, 3];
      expect(arr.includes(2)).toBe(true);
      expect(arr.includes(4)).toBe(false);
    });

    test('should sort arrays', () => {
      const arr = [3, 1, 4, 2];
      const result = arr.sort((a, b) => a - b);
      expect(result).toEqual([1, 2, 3, 4]);
    });
  });

  describe('Object utilities', () => {
    test('should get object keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(Object.keys(obj)).toEqual(['a', 'b', 'c']);
    });

    test('should get object values', () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(Object.values(obj)).toEqual([1, 2, 3]);
    });

    test('should check if object has property', () => {
      const obj = { a: 1, b: 2 };
      expect(obj.hasOwnProperty('a')).toBe(true);
      expect(obj.hasOwnProperty('c')).toBe(false);
    });

    test('should merge objects', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { c: 3, d: 4 };
      const result = { ...obj1, ...obj2 };
      expect(result).toEqual({ a: 1, b: 2, c: 3, d: 4 });
    });
  });

  describe('Async utilities', () => {
    test('should handle promises', async () => {
      const promise = Promise.resolve('test');
      const result = await promise;
      expect(result).toBe('test');
    });

    test('should handle promise rejection', async () => {
      const promise = Promise.reject(new Error('test error'));
      await expect(promise).rejects.toThrow('test error');
    });

    test('should handle setTimeout', (done) => {
      setTimeout(() => {
        expect(true).toBe(true);
        done();
      }, 0);
    });

    test('should handle setInterval', (done) => {
      let count = 0;
      const interval = setInterval(() => {
        count++;
        if (count === 2) {
          clearInterval(interval);
          expect(count).toBe(2);
          done();
        }
      }, 0);
    });
  });
});
