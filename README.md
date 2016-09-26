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

## getting started
- install go, and setup your gopath
- install nodejs
- install rethinkdb
- check out the github project into $GOPATH/src/github.com/monofuel/badmars
- `make setup` to prepare the project initially


## new setup to start the server
- if rethinkdb is on your path, badmars will run it, otherwise you can run it from a separate terminal or as a daemon.
- run `make run` or `go run main.go`
- http://localhost:3002/badMars_v1 for the game server
- http://localhost:8080/ for rethinkdb

## alternative for docker
- run `sh dev-docker-start.sh`
- http://localhost:3002/badMars_v1 for the game server
- http://localhost:8080/ for rethinkdb

## old way to start the server
run dev-start.sh to start rethink, and all the backend services.
after dev-start is running, you can use tmux attach to attach to it.
dev-start will run most services with nodemon, so they will auto reload on updates.
the net and web services are set to not run with nodemon,
so that you can test changes without reconnecting.
- http://localhost:3002/badMars_v1 for the game server
- http://localhost:8080/ for rethinkdb


The current goal for the game is to freeze new features and focus on bug fixing and
code cleanup.

current primary task:
- fix bugs with unit spawning and movement with new chunk system
- fix bug where spawning sometimes gets caught in a loop if there are no open tiles
- re-make UI with material-ui with react to look nicer
	- admin dashboard is already using material-ui
	- clean up and re-organize UI nicer.
		- maybe do twitch-style chat on the right side of the screen?
- fix up auth stuff now that the game is more seriously working
- polishing and bug fixing for v1.0
- cancel ghost feature
- have units actually use fuel
- time left for fuel usage on units

current bugs:
- first login takes a while. a long while.
- unit movement is a little jumpy on the client when server ticks are on time
- when starting multiple services at once, sometimes the tables in rethinkdb
aren't generated properly and have duplicates. delete the duplicates and start just one service.


TODO:
- have a 'locking' table on the chunk document for unit positions (in progress)
	- use this table to keep unit movement locked,
also use this table to speed up the function 'getUnitsAtChunk'
- watch user table for changes and push updates to users (eg: color changes)
- unit tests and integration tests
- dummy DB interface to allow testing modules in production without actually writing changes
- properly flowtype the entire codebase
- some sort of a distributed locking system for unit movement? maybe lock unit movement to the chunk document
- work through TODOs in code and refactor things that I was too lazy to do properly the first time around
- work on documentation
- SSAO lighting effects (client)
- better models (client)
- textures (client)
- color or flag system (client & server)
- lines between units showing how resources are being automatically delivered. (client)
- cancel ghost feature (server)
- trade routes (both client and server)
- music (epic guitar stuffs of course)
- pushbullet integration for offline notifications
