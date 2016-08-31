awesome webGL MMORTS with an infinite procedurally generated map.

tech stack:
- backend:
	- nodejs
	- golang (separate repository atm)
	- grpc
	- rethinkdb


- frontend:
	- react
	- threejs

getting started:
- if you're on debian, run dev-setup.sh
- otherwise read dev-setup.sh and install everything yourself with a real package manager like emerge

- `cd client/`
- `npm install`
- `make copy` copy dependencies, 3d and audio assets to server directory
- build the client:
	- `gulp transpile` builds the code and moves it to the server
	- `gulp watch` live updates client code on updates


run dev-start.sh to start rethink, and all the backend services.
dev-start will run most services with nodemon, so they will auto reload on updates.
the net and web services are set to not run with nodemon,
so that you can test changes without reconnecting.
- http://localhost:3002/badMars_v1 for the game server
- http://localhost:8080/ for rethinkdb


The current goal for the game is to freeze new features and focus on bug fixing and
code cleanup.

current primary task:
- switch unit movement (unit/ai/movement.js) to use chunk.moveUnit
 - Previously, we would query for all units at a location, however this
allowed for a hole where multiple units could be on the same tile.
Moving to a new system where each chunk keeps a map of tiles -> unit uuids
for unit locations. use atomic rethinkdb operations to ensure only 1 unit is on a tile.
(this table is also probably faster for performance)
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
- unit movement is a little jumpy on the client when server ticks are on time
- when starting multiple services at once, sometimes the tables in rethinkdb
aren't generated properly and have duplicates. delete the duplicates and start just one service.


TODO:
- have a 'locking' table on the chunk document for unit positions (in progress)
	- use this table to keep unit movement locked,
also use this table to speed up the function 'getUnitsAtChunk'
- watch user table for changes and push updates to users (eg: color changes)
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
