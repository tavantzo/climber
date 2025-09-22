const { spawn } = require('child_process');
const chalk = require('chalk');
const path = require('path');

/**
 * Check if a service is ready by making an HTTP request
 * @param {string} url - URL to check
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<boolean>} - True if service is ready
 */
async function checkHttpReadiness(url, timeout = 5000) {
  return new Promise((resolve) => {
    const child = spawn('curl', ['-f', '-s', '--max-time', String(timeout / 1000), url], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve(code === 0);
    });

    child.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Check if a service is ready by checking if a port is open
 * @param {string} host - Host to check
 * @param {number} port - Port to check
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<boolean>} - True if service is ready
 */
async function checkPortReadiness(host, port, timeout = 5000) {
  return new Promise((resolve) => {
    const child = spawn('nc', ['-z', '-w', String(timeout / 1000), host, String(port)], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    child.on('close', (code) => {
      resolve(code === 0);
    });

    child.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Check if a service is ready by running a custom command
 * @param {string} command - Command to run
 * @param {string} cwd - Working directory
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<boolean>} - True if service is ready
 */
async function checkCommandReadiness(command, cwd, timeout = 5000) {
  return new Promise((resolve) => {
    const [cmd, ...args] = command.split(' ');
    const child = spawn(cmd, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const timeoutId = setTimeout(() => {
      child.kill('SIGTERM');
      resolve(false);
    }, timeout);

    child.on('close', (code) => {
      clearTimeout(timeoutId);
      resolve(code === 0);
    });

    child.on('error', () => {
      clearTimeout(timeoutId);
      resolve(false);
    });
  });
}

/**
 * Check if a dependency is ready based on its readiness configuration
 * @param {Object} dependency - Dependency configuration
 * @param {string} projectPath - Path to the dependency project
 * @returns {Promise<boolean>} - True if dependency is ready
 */
async function checkDependencyReadiness(dependency, projectPath) {
  const { readiness } = dependency;

  if (!readiness) {
    // No readiness check configured, assume ready
    return true;
  }

  const { type, config, timeout = 5000 } = readiness;

  try {
    switch (type) {
      case 'http':
        return await checkHttpReadiness(config.url, timeout);

      case 'port':
        return await checkPortReadiness(config.host || 'localhost', config.port, timeout);

      case 'command':
        return await checkCommandReadiness(config.command, projectPath, timeout);

      case 'docker':
        // Check if Docker container is running and healthy
        return await checkDockerReadiness(config.container, config.service, projectPath, timeout);

      default:
        console.warn(chalk.yellow(`Unknown readiness check type: ${type}`));
        return true;
    }
  } catch (error) {
    console.warn(chalk.yellow(`Readiness check failed for ${dependency.name}: ${error.message}`));
    return false;
  }
}

/**
 * Check if a Docker service is ready
 * @param {string} container - Container name or pattern
 * @param {string} service - Service name
 * @param {string} projectPath - Project path
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<boolean>} - True if service is ready
 */
async function checkDockerReadiness(container, service, projectPath, timeout = 5000) {
  return new Promise((resolve) => {
    const args = ['compose', 'ps', '--format', 'json', service];
    const child = spawn('docker', args, {
      cwd: projectPath,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    const timeoutId = setTimeout(() => {
      child.kill('SIGTERM');
      resolve(false);
    }, timeout);

    child.on('close', (code) => {
      clearTimeout(timeoutId);

      if (code !== 0) {
        resolve(false);
        return;
      }

      try {
        const services = stdout.trim().split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
        const targetService = services.find(s => s.Service === service);

        if (!targetService) {
          resolve(false);
          return;
        }

        // Check if service is running and healthy
        const isRunning = targetService.State === 'running';
        const isHealthy = !targetService.Health || targetService.Health === 'healthy';

        resolve(isRunning && isHealthy);
      } catch (error) {
        resolve(false);
      }
    });

    child.on('error', () => {
      clearTimeout(timeoutId);
      resolve(false);
    });
  });
}

/**
 * Wait for dependencies to be ready with retry logic
 * @param {Array} dependencies - Array of dependency configurations
 * @param {string} projectPath - Path to the current project
 * @param {Object} options - Retry options
 * @returns {Promise<boolean>} - True if all dependencies are ready
 */
async function waitForDependencies(dependencies, projectPath, options = {}) {
  const {
    maxRetries = 30,
    retryDelay = 2000,
    timeout = 5000
  } = options;

  if (!dependencies || dependencies.length === 0) {
    return true;
  }

  console.log(chalk.blue(`🔍 Checking readiness of ${dependencies.length} dependencies...`));

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const results = await Promise.all(
      dependencies.map(async (dependency) => {
        const isReady = await checkDependencyReadiness(dependency, projectPath);
        return { dependency, isReady };
      })
    );

    const readyDependencies = results.filter(r => r.isReady);
    const notReadyDependencies = results.filter(r => !r.isReady);

    if (notReadyDependencies.length === 0) {
      console.log(chalk.green(`✅ All dependencies are ready!`));
      return true;
    }

    if (attempt < maxRetries) {
      console.log(chalk.yellow(`⏳ Attempt ${attempt}/${maxRetries}: ${notReadyDependencies.length} dependencies not ready yet...`));
      notReadyDependencies.forEach(({ dependency }) => {
        console.log(chalk.gray(`   - ${dependency.name} (${dependency.readiness?.type || 'no check'})`));
      });

      console.log(chalk.gray(`   Retrying in ${retryDelay / 1000} seconds...\n`));
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  console.error(chalk.red(`❌ Dependencies not ready after ${maxRetries} attempts:`));
  const results = await Promise.all(
    dependencies.map(async (dependency) => {
      const isReady = await checkDependencyReadiness(dependency, projectPath);
      return { dependency, isReady };
    })
  );

  results.filter(r => !r.isReady).forEach(({ dependency }) => {
    console.error(chalk.red(`   - ${dependency.name} (${dependency.readiness?.type || 'no check'})`));
  });

  return false;
}

/**
 * Get dependency readiness configuration for a project
 * @param {Object} project - Project configuration
 * @param {Object} config - Full configuration
 * @returns {Array} - Array of dependency configurations with readiness info
 */
function getDependencyReadinessConfig(project, config) {
  if (!config.dependencies || !config.dependencies[project.name]) {
    return [];
  }

  const dependencyNames = config.dependencies[project.name];
  const allProjects = config.projects || [];

  return dependencyNames.map(depName => {
    const depProject = allProjects.find(p => p.name === depName);
    return {
      name: depName,
      project: depProject,
      readiness: depProject?.readiness
    };
  }).filter(dep => dep.project); // Only include dependencies that exist
}

module.exports = {
  checkHttpReadiness,
  checkPortReadiness,
  checkCommandReadiness,
  checkDockerReadiness,
  checkDependencyReadiness,
  waitForDependencies,
  getDependencyReadinessConfig
};
