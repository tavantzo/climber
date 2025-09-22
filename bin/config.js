const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const toposort = require('toposort');
const chalk = require('chalk');

class ConfigManager {
  constructor() {
    this.configDir = path.join(process.env.HOME, '.climber-config');
    this.workspacesFile = path.join(this.configDir, 'workspaces.yaml');
    this.currentWorkspace = this.getCurrentWorkspaceFromRegistry();
    this.config = null;
  }

  getCurrentWorkspaceFromRegistry() {
    try {
      if (fs.existsSync(this.workspacesFile)) {
        const buffer = fs.readFileSync(this.workspacesFile, { encoding: 'utf8' });
        const workspacesRegistry = yaml.load(buffer);
        if (workspacesRegistry && typeof workspacesRegistry === 'object' && workspacesRegistry.current) {
          return workspacesRegistry.current;
        }
      }
    } catch (error) {
      // Fall back to environment variable or default
    }
    return process.env.CLIMBER_WORKSPACE || 'default';
  }

  getCurrentWorkspaceConfig() {
    return path.join(this.configDir, 'workspaces', `${this.currentWorkspace}.yaml`);
  }

  load() {
    try {
      // First, try to migrate from old single config format
      this.migrateFromOldFormat();

      // Load current workspace configuration
      const configFile = this.getCurrentWorkspaceConfig();

      if (!fs.existsSync(configFile)) {
        console.error(chalk.red(`Workspace "${this.currentWorkspace}" not found.`));
        console.error(chalk.yellow('Available workspaces:'));
        this.listWorkspaces().forEach(workspace => {
          console.error(chalk.gray(`  - ${workspace}`));
        });
        console.error(chalk.yellow('\nRun "climb workspace create" to create a new workspace.'));
        process.exit(1);
      }

      const buffer = fs.readFileSync(configFile, { encoding: 'utf8' });
      this.config = yaml.load(buffer);
      this.validateConfig();
      return this.config;
    } catch (error) {
      console.error(chalk.red('Error reading configuration:'), error.message);
      console.error(chalk.yellow('Please run "climb workspace create" to set up a workspace.'));
      process.exit(1);
    }
  }

  migrateFromOldFormat() {
    const oldConfigFile = path.join(this.configDir, 'config.yaml');
    const oldJsonConfigFile = path.join(this.configDir, 'config.json');

    if (fs.existsSync(oldConfigFile) || fs.existsSync(oldJsonConfigFile)) {
      try {
        let oldConfig;

        if (fs.existsSync(oldConfigFile)) {
          const buffer = fs.readFileSync(oldConfigFile, { encoding: 'utf8' });
          oldConfig = yaml.load(buffer);
        } else if (fs.existsSync(oldJsonConfigFile)) {
          const buffer = fs.readFileSync(oldJsonConfigFile, { encoding: 'utf8' });
          oldConfig = JSON.parse(buffer);
        }

        if (oldConfig) {
          // Create workspaces directory
          const workspacesDir = path.join(this.configDir, 'workspaces');
          fs.mkdirSync(workspacesDir, { recursive: true });

          // Convert old format to new format
          let newConfig;
          if (oldConfig.folders && Array.isArray(oldConfig.folders)) {
            // Convert old format with folders array
            newConfig = {
              root: oldConfig.root,
              projects: oldConfig.folders.map(folder => ({
                name: folder,
                path: folder,
                description: `Auto-migrated project: ${folder}`
              })),
              environments: {
                default: {
                  description: 'Default environment',
                  projects: oldConfig.folders
                }
              },
              dependencies: {}
            };
          } else {
            // Use existing config if it's already in new format
            newConfig = oldConfig;
          }

          // Create default workspace
          const defaultWorkspaceFile = path.join(workspacesDir, 'default.yaml');
          fs.writeFileSync(defaultWorkspaceFile, yaml.dump(newConfig, {
            indent: 2,
            lineWidth: -1,
            noRefs: true
          }));

          // Create workspaces registry
          const workspacesRegistry = {
            workspaces: {
              default: {
                name: 'default',
                description: 'Migrated from old configuration',
                created: new Date().toISOString(),
                configFile: 'default.yaml'
              }
            },
            current: 'default'
          };

          fs.writeFileSync(this.workspacesFile, yaml.dump(workspacesRegistry, {
            indent: 2,
            lineWidth: -1,
            noRefs: true
          }));

          // Backup old files
          if (fs.existsSync(oldConfigFile)) {
            fs.renameSync(oldConfigFile, oldConfigFile + '.backup');
          }
          if (fs.existsSync(oldJsonConfigFile)) {
            fs.renameSync(oldJsonConfigFile, oldJsonConfigFile + '.backup');
          }

          console.log(chalk.green('✓ Migrated old configuration to workspace "default"'));
          console.log(chalk.yellow('✓ Old configuration files backed up'));
        }
      } catch (error) {
        console.warn(chalk.yellow('Warning: Could not migrate old configuration:'), error.message);
      }
    }
  }

  validateConfig() {
    if (!this.config) {
      throw new Error('Configuration is empty');
    }

    if (!this.config.root) {
      throw new Error('Missing required field: root');
    }

    if (!this.config.projects || !Array.isArray(this.config.projects)) {
      throw new Error('Missing or invalid projects array');
    }

    // Validate each project
    this.config.projects.forEach((project, index) => {
      if (!project || typeof project !== 'object') {
        throw new Error(`Project at index ${index} is not a valid object`);
      }
      if (!project.name) {
        throw new Error(`Project at index ${index} is missing required field: name`);
      }
      if (!project.path) {
        throw new Error(`Project at index ${index} is missing required field: path`);
      }
    });
  }

  getProjectsForEnvironment(environment = 'default') {
    if (!this.config) {
      this.load();
    }

    const envConfig = this.config.environments?.[environment] || {};
    const enabledProjects = envConfig.projects || this.config.projects.map(p => p.name);

    return this.config.projects.filter(project =>
      enabledProjects.includes(project.name)
    );
  }

  getStartupOrder(environment = 'default') {
    const projects = this.getProjectsForEnvironment(environment);

    if (!this.config.dependencies) {
      return projects;
    }

    // Build dependency graph
    const graph = [];
    const projectNames = projects.map(p => p.name);

    // Add all projects as nodes
    projectNames.forEach(name => {
      graph.push([name, null]);
    });

    // Add dependencies
    Object.entries(this.config.dependencies).forEach(([project, deps]) => {
      if (projectNames.includes(project) && Array.isArray(deps)) {
        deps.forEach(dep => {
          if (projectNames.includes(dep)) {
            graph.push([dep, project]);
          }
        });
      }
    });

    try {
      const sortedNames = toposort(graph).filter(name => name !== null);
      return sortedNames.map(name =>
        projects.find(p => p.name === name)
      ).filter(Boolean);
    } catch (error) {
      console.warn(chalk.yellow('Warning: Circular dependency detected, using original order'));
      return projects;
    }
  }

  getProjectPaths(environment = 'default') {
    const projects = this.getStartupOrder(environment);
    return projects.map(project => path.join(this.config.root, project.path));
  }

  save(config) {
    try {
      const workspacesDir = path.join(this.configDir, 'workspaces');
      fs.mkdirSync(workspacesDir, { recursive: true });

      const configFile = this.getCurrentWorkspaceConfig();
      const yamlContent = yaml.dump(config, {
        indent: 2,
        lineWidth: -1,
        noRefs: true
      });
      fs.writeFileSync(configFile, yamlContent);
    } catch (error) {
      console.error(chalk.red('Error saving configuration:'), error.message);
      throw error;
    }
  }

  // Workspace management methods
  listWorkspaces() {
    try {
      if (!fs.existsSync(this.workspacesFile)) {
        return [];
      }

      const buffer = fs.readFileSync(this.workspacesFile, { encoding: 'utf8' });
      const workspacesRegistry = yaml.load(buffer);
      if (workspacesRegistry && typeof workspacesRegistry === 'object' && workspacesRegistry.workspaces) {
        return Object.keys(workspacesRegistry.workspaces);
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  getWorkspaceInfo(workspaceName) {
    try {
      if (!fs.existsSync(this.workspacesFile)) {
        return null;
      }

      const buffer = fs.readFileSync(this.workspacesFile, { encoding: 'utf8' });
      const workspacesRegistry = yaml.load(buffer);
      if (workspacesRegistry && typeof workspacesRegistry === 'object' && workspacesRegistry.workspaces) {
        return workspacesRegistry.workspaces[workspaceName] || null;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  createWorkspace(name, description = '') {
    try {
      // Check if workspace already exists
      if (this.listWorkspaces().includes(name)) {
        throw new Error(`Workspace "${name}" already exists`);
      }

      // Create workspaces directory
      const workspacesDir = path.join(this.configDir, 'workspaces');
      fs.mkdirSync(workspacesDir, { recursive: true });

      // Create workspace configuration
      const configFile = path.join(workspacesDir, `${name}.yaml`);

      // Try to copy configuration from current workspace, or create empty one
      let newConfig;
      try {
        const currentConfig = this.load();
        newConfig = {
          root: currentConfig.root,
          projects: currentConfig.projects,
          environments: currentConfig.environments,
          dependencies: currentConfig.dependencies
        };
      } catch (error) {
        // If current workspace is invalid, create empty configuration
        newConfig = {
          root: '',
          projects: [],
          environments: {
            default: {
              description: 'Default environment',
              projects: []
            }
          },
          dependencies: {}
        };
      }

      fs.writeFileSync(configFile, yaml.dump(newConfig, {
        indent: 2,
        lineWidth: -1,
        noRefs: true
      }));

      // Update workspaces registry
      this.updateWorkspacesRegistry(name, description);

      return true;
    } catch (error) {
      console.error(chalk.red('Error creating workspace:'), error.message);
      throw error;
    }
  }

  deleteWorkspace(name) {
    try {
      if (name === 'default') {
        throw new Error('Cannot delete the default workspace');
      }

      const workspaces = this.listWorkspaces();
      if (!workspaces.includes(name)) {
        throw new Error(`Workspace "${name}" does not exist`);
      }

      // Delete workspace configuration file
      const configFile = path.join(this.configDir, 'workspaces', `${name}.yaml`);
      if (fs.existsSync(configFile)) {
        fs.unlinkSync(configFile);
      }

      // Update workspaces registry
      const buffer = fs.readFileSync(this.workspacesFile, { encoding: 'utf8' });
      const workspacesRegistry = yaml.load(buffer);

      if (workspacesRegistry && typeof workspacesRegistry === 'object') {
        if (workspacesRegistry.workspaces) {
          delete workspacesRegistry.workspaces[name];
        }

        // If we deleted the current workspace, switch to default
        if (workspacesRegistry.current === name) {
          workspacesRegistry.current = 'default';
        }
      }

      fs.writeFileSync(this.workspacesFile, yaml.dump(workspacesRegistry, {
        indent: 2,
        lineWidth: -1,
        noRefs: true
      }));

      return true;
    } catch (error) {
      console.error(chalk.red('Error deleting workspace:'), error.message);
      throw error;
    }
  }

  switchWorkspace(name) {
    try {
      const workspaces = this.listWorkspaces();
      if (!workspaces.includes(name)) {
        throw new Error(`Workspace "${name}" does not exist`);
      }

      // Update workspaces registry
      const buffer = fs.readFileSync(this.workspacesFile, { encoding: 'utf8' });
      const workspacesRegistry = yaml.load(buffer);
      if (workspacesRegistry && typeof workspacesRegistry === 'object') {
        workspacesRegistry.current = name;
      }

      fs.writeFileSync(this.workspacesFile, yaml.dump(workspacesRegistry, {
        indent: 2,
        lineWidth: -1,
        noRefs: true
      }));

      this.currentWorkspace = name;
      return true;
    } catch (error) {
      console.error(chalk.red('Error switching workspace:'), error.message);
      throw error;
    }
  }

  getCurrentWorkspace() {
    try {
      if (!fs.existsSync(this.workspacesFile)) {
        return 'default';
      }

      const buffer = fs.readFileSync(this.workspacesFile, { encoding: 'utf8' });
      const workspacesRegistry = yaml.load(buffer);
      if (workspacesRegistry && typeof workspacesRegistry === 'object' && workspacesRegistry.current) {
        return workspacesRegistry.current;
      }
      return 'default';
    } catch (error) {
      return 'default';
    }
  }

  updateWorkspacesRegistry(name, description = '') {
    try {
      let workspacesRegistry = {
        workspaces: {},
        current: 'default'
      };

      if (fs.existsSync(this.workspacesFile)) {
        const buffer = fs.readFileSync(this.workspacesFile, { encoding: 'utf8' });
        const loaded = yaml.load(buffer);
        if (loaded && typeof loaded === 'object') {
          workspacesRegistry = loaded;
        }
      }

      workspacesRegistry.workspaces[name] = {
        name: name,
        description: description,
        created: new Date().toISOString(),
        configFile: `${name}.yaml`
      };

      fs.writeFileSync(this.workspacesFile, yaml.dump(workspacesRegistry, {
        indent: 2,
        lineWidth: -1,
        noRefs: true
      }));
    } catch (error) {
      console.error(chalk.red('Error updating workspaces registry:'), error.message);
      throw error;
    }
  }
}

module.exports = new ConfigManager();
