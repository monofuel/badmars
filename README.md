# BadMars

![](/public/badmars/images/land.png?raw=true "Totally Not Mars")

## Running

- `npm install`, `make build` and then `make run`
- server will be up at http://localhost:3002

docker-compose stuff is currently broken


### backend services:
- web | nodejs service that provides the actual website
- net | nodejs service that provides a websocket server for clients to connect to.
sends the player information about the game world, and receives commands from the player.
- auth | go service that handles registration and authorization
- dashboard | go service that provides an admin dashboard site
- chunk | nodejs service that handles chunk generation and caching.
- ai | nodejs service that handles unit AI logic each game tick.
- pathfinder | nodejs service that handles pathfinding for units.
- simulate | go service that controls the backend tickrate for each planet.
- commander | nodejs tool for running commands against the database
