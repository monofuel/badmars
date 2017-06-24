awesome webGL MMORTS with an infinite procedurally generated map.

## tech stack
- backend:
	- nodejs
	- golang
	- grpc
	- rethinkdb

- frontend:
	- react
	- threejs

## docker-compose method
- run `docker-compose build`
- run `make dockerWatch` so that it hot reloads on the fly, or `make dockerBuild` to rebuild once.
	- to build outside of docker (faster):
		- install yarn
		- run `npm install -g browserify watchify flow-bin babel-watch babel-core node-gyp babel-cli`
		- run `make buildServer -j 4` or `make watchServer -j 10`
- then `docker-compose up`
- http://localhost:3002/badmars for the game server
- http://localhost:8085/ for rethinkdb

## running a dev server without docker
warning: these instructions are outdated since the build system refactoring
- install go, and setup your gopath
- install nodejs
- install rethinkdb
- check out the github project into $GOPATH/src/github.com/monofuel/badmars
- `make setup` to prepare the project initially
- if rethinkdb is on your path, badmars will run it, otherwise you can run it from a separate terminal or as a daemon.
- run `make run` or `go run main.go`
- http://localhost:3002/badMars_v1 for the game server
- http://localhost:8085/ for rethinkdb
- run `make check` to check that everything looks good while running the server

## VSC notes

- install tslint, eslint and flow language support plugins
- set `javascript.validate.enable` to false for working on flowtyped code

## Architecture
Frontend talks to the net backend service via websockets. All of the backend services
coordinate together with grpc for direct communication and rethinkdb for data storage
and realtime changes. The backend is currently a mix of nodejs and go. Currently, just
rapid-prototyping out the backend, however it would be a good idea to migrate
everything to go (since i discovered i really like go) and have a more testable system.
All backend services should be capable of scaling across many processes on many servers.
In the future, the main.go program should be improved to support delegating work across
many servers. However, services like docker swarm or kubernetes can currently be used instead
to handle backend cluster orchestration.

### backend services:
- web | nodejs service that provides the actual website
- net | nodejs service that provides a websocket server for clients to connect to.
sends the player information about the game world, and receives commands from the player.
- dashboard | go service that provides an admin dashboard site
- chunk | nodejs service that handles chunk generation and caching.
- ai | nodejs service that handles unit AI logic each game tick.
- pathfinder | nodejs service that handles pathfinding for units.
- simulate | go service that controls the backend tickrate for each planet.
- commander | nodejs tool for running commands against the database
