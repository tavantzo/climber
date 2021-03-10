# Climber
----------
A command line tool to handle simultaneously multiple dockerized services that are orchestrated using docker-compose.

## Getting Started

#### Installation

`yarn global add climber`

or

`npm install -g climber`


#### Initialize

`climb init`
`Enter the root directory of your projects: ../my-services`
`Enter a folder containing a docker-compose.yml file or nothing to exit: Service1`
`Enter a folder containing a docker-compose.yml file or nothing to exit: Service2`
`Enter a folder containing a docker-compose.yml file or nothing to exit: ServiceN`

Now the tool is ready to use.

#### Other available commands

`climb up` Build, recreates and starts all the services. Also removes any orphan containers.
`climb down` Stops all the services.
`climb ps` Outputs the services status.

