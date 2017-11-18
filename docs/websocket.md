# Websocket

## Authorization

send a POST request to /auth/login with the body:

```
{
	username: string,
	password: string
}
```

which should give the response:
```
{
	sessionToken: sess.Token
}
```

When logging into the website, you can find your session token in session storage.
```
sessionStorage.getItem('session-token')
```

session tokens currently live forever, so be careful with them.

All protected endpoints will require that you pass the authorization bearer header
```
{
	'authorization': `Bearer ${sessionToken}`
}
```

## Connecting

some websocket libraries have issues with headers (I'M LOOKIN AT YOU NODE) so pass the token as a url parameter.

### Local development
connect to `ws://localhost:7005/net?token=${token}`

### Production
connect to `wss://japura.net/net?token=${token}`

## Object Types

Map
```
{
	name: string,
	seed: number,
	settings: {
		chunkSize: number,
		waterHeight: number,
		cliffDelta: number,
		water: boolean,
		bigNoise: number,
		medNoise: number,
		smallNoise: number,
		bigNoiseScale: number,
		medNoiseScale: number,
		smallNoiseScale: number,
		ironChance: number,
		oilChance: number
	},
	paused: boolean
}
```

Unit (some fields optional, and some fields are hidden for enemy units)
```
{
	uuid: string,
	awake: boolean,
	details: {
		type: UnitType,
		size: number,
		buildTime: number,
		cost: number,
		health: number,
		maxHealth: number,
		lastTick: number,
		ghosting: boolean,
		owner: string,
	},
	location: {
		hash: string[],
		x: number,
		y: number,
		chunkHash: string[],
		chunkX: number,
		chunkY: number,
		map: string,
	},
	movable?: {
		layer: MovementLayer,
		speed: number,
		movementCooldown: number,
		path: Array<TileHash>,
		pathAttempts: number,
		pathAttemptAttempts: number,
		isPathing: boolean,
		pathUpdate: number,
		destination: null | TileHash,
		transferGoal: null | {
			uuid: string,
			iron?: number,
			fuel?: number,
		}
	},
	attack?: {
		layers: Array<MovementLayer>,
		range: number,
		damage: number,
		fireRate: number,
		fireCooldown: number,
	}
	storage?: {
		iron: number,
		fuel: number,
		maxIron: number,
		maxFuel: number,
		transferRange: number,
		resourceCooldown: number
	},
	graphical?: {
		model: string,
		scale: number,
	}
	stationary?: {
		layer: MovementLayer,
	}
	construct?: {
		types: Array<string>,
		constructing?: {
			remaining: number,
			type: string,
		}
	}
}
```

UnitStat
```
{
	// TODO
}
```

## Protocol

All requests are json objects with a type field. All responses include both the type field and a success field.
If the request was not successful, a reason field will be provided with a human readable message.

In the future, If this is useful for clients, they should be allowed to optionally include a uuid field that is passed through and included in responses for the request. 

The server will keep track of the last 60 chunks that have been requested, and will send you unit updates for them.  If you request more than 60 chunks, you will no longer get updates for the oldest chunk until you ask for it again.

Some data like Chat, units and players may get pushed to the client automatically

Chat
```
{
	type: 'chat',
	uuid: string,
	user: string,
	channel: string,
	text: string,
	timestamp: Date,
}
```

### Login

Before you can do anything, you have to login to a planet.
```
{
	type: 'login',
	planet: 'testmap'
}
```
which should respond with
```
{
	type: 'login',
	success: true
}
```
After success, the server will now allow you to perform the following commands.

### getMap
map and planet mean the same thing. Previously I used the name 'map', however discovered this conflicts
with the built-in Map structure (oops). all uses of 'map' should be changed to planet.

Request:
```
{ type: 'getMap' }
```

which will cause several responses.

```
{
	type: 'map',
	map: Map,
	success: true
}
```

```
{
	type: 'unitStats',
	unitStats: {
		[type: string]: UnitStat
	}
}
```

```
{
	type: 'players',
	players: Player[],
}
```

If you have already spawned, it will also send chunks and units
```
{
	type: 'chunk',
	chunk: Chunk
}
```
```
{
	type: 'units',
	units: Unit[],
}
```

### spawn
spawn will throw an error if you already have units on the planet

Request
```
{
	type: 'spawn'
}
```

the response will be many chunks and units.
```
{
	type: 'chunk',
	chunk: Chunk
}
```
```
{
	type: 'units',
	units: Unit[],
}
```

### getChunk
Request
```
{
	type: 'getChunk',
	x: number,
	y: number
}
```

Response
```
{
	type: 'chunk',
	chunk: Chunk
}
```
```
{
	type: 'units',
	units: Unit[],
}
```

### createGhost
Request
```
{
	type: 'createGhost',
	unitType: string,
	location: [x, y]
}
```

### setDestination
Request
```
{
	type: 'setDestination',
	unitId: string,
	location: [x, y]
}
```

### transferResource
Request
```
{
	type: 'transferResource',
	source: string,
	dest: string,
	iron?: number,
	fuel?: number
}
```

The source unit will automatically pathfind to the destination unit and perform the transfer

### factoryOrder
Request
```
{ 
	type: 'factoryOrder',
	unitType: string,
}
```
TODO: handle canceling factory orders

### sendChat
Request
```
{
	type: 'sendChat',
	text: string
}
```