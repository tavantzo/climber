# Climber
----------
A command line tool to handle simultaneously multiple dockerized services that are orchestrated using docker-compose.

## Getting Started

#### Installation

`yarn global add mountain-climber`

or

`npm install -g mountain-climber`


#### Initialize

```
climb init

Enter the root directory of your projects: ~/my-services

Enter a folder contains a docker-compose.yml file or nothing to exit: Service1
Enter a folder contains a docker-compose.yml file or nothing to exit: Service2
....
Enter a folder contains a docker-compose.yml file or nothing to exit: ServiceN
Enter a folder contains a docker-compose.yml file or nothing to exit:

Done!
BYE BYE !!!"
```
**Also there is and auto discover mode that finds docker-compose files under the declared as root directory. Just follow the wizard.**

Now the tool is ready to use.

#### Other available commands

- `climb up`:  Build, recreates and starts all the services. Also removes any orphan containers.
- `climb down`:  Stops all the services.
- `climb ps`:  Outputs the services status.
- `climb help`: Outputs a help text
- `climb version`: Outputs the current version

