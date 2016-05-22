#Monofuel
'use strict';

WebSocketServer = require('ws').Server
BadMars = require('./badMars.js')
Units = require('./units.js')
db = require('./db.js')
hat = require('hat')
Logger = require('./util/logger.js')

clientList = []
exports.clientList = clientList
KEEP_ALIVE = 5000;

listeners = {};

exports.registerListener = (eventType, listener) ->
	console.log("registering " + eventType + " listener")
	if (!listeners[eventType])
		listeners[eventType] = []
	if (listeners[eventType].indexOf(listener) != -1)
		console.log("duplicate listener registered for " + eventType);
		Logger.serverInfo('error',{
			eventType: eventType,
			msg: 'duplicate listener',
			stack: (new Error()).stack()
			})
	listeners[eventType].push(listener)

exports.deleteListener = () ->
	for eventType in Object.keys(listeners)
		for i in [0..listeners[eventType].length]
			if (listeners[eventType[i]] == listener)
				listeners[eventType].splice(i,1);

exports.sendMessage = (player, data) ->
	if (!data || !data.type)
		console.log('invalid message sent without data.type')
		console.log(new Error().stack)

	for client in clientList
		try
			if (client.userInfo.id == player.id)
				client.send(data)
		catch error
			console.log('error sending: ',error)




class client
	constructor: (@ws) ->
		ws = @ws;

		thisClient = this;
		clientList.push(this)

		@ws.on('message',(msg) ->
			thisClient.handleFromClient(msg)
			)
		@ws.on('error',(message) ->
			console.log('ws error: ' + message)
			)

		@ws.on('close', () ->
			console.log("client closed connection")
			clientList.splice(clientList.indexOf(thisClient),1)
			)
		@ws.send(success('connected'))

		keepAlive = setInterval(() ->
			try
				ws.ping()
			catch err
				clearInterval(keepAlive)
		,KEEP_ALIVE)

	send: (data) ->
		@ws.send(JSON.stringify(data))
	###
	requests that clients can do:

	login
	  {"login":{"planet":"testPlanet","username":"testUser"}}

	getMap
	  get the heightmap for the current game world
	  {"type": "getMap"}

	spawn
	  request to be spawned into the world

	getUnits
	  get all visible units

	setDestination
	  set the destination for a unit
	  attack move yes/no

	attack
	  tell a unit to attack another specific unit
	###

	handleFromClient: (message) ->
		thisClient = this
		console.log('recieved: ' + message)
		message = JSON.parse(message);
		if (!@user && message.type)
			if (message.type == 'login')
				if (!message.planet)
					@ws.send(errMsg('login', 'specify a planet'))
					return
				if (!message.username)
					@ws.send(errMsg('login', 'invalid username'))
					return

				for planet in BadMars.planetList
					if planet.name == message.planet
						@planet = planet
				if (@planet)
					console.log('looking up user: ' + message.username);
				else if (!@planet)
					console.log('player tried connecting to invalid planet: ' + message.planet)
					thisClient.ws.send(errMsg('login' ,'invalid planet'))
					return;

			db.getUserByName(message.username)
			.then( (userInfo) ->
				if (!userInfo)
					throw new Error('Nonexistant User')
				if (message.apiKey != userInfo.apiKey)
					console.log('failed apikey check')
					thisClient.ws.send(errMsg('login' ,'failed authentication'))
					return
				thisClient.user = userInfo.username;
				thisClient.userInfo = userInfo;
				console.log('logging in user: ' + userInfo.username);
				thisClient.ws.send(success('login'))
				return;
			).catch( (err) ->
				if (err.message != 'Nonexistant User')
					throw new Error('failed user lookup')
				if (!message.color)
					thisClient.ws.send(errMsg('login', 'please specify a color'))
					return

				if (message.username.length > 32)
					thisClient.ws.send(errMsg('login' ,'username too long'))
				console.log('creating new user');
				return db.createUser(message.username, message.color)
				.then( (userInfo) ->
					thisClient.user = userInfo.username;
					thisClient.userInfo = userInfo;
					console.log('account created for user: ' + userInfo.username);
					thisClient.ws.send(success('login',{apiKey: userInfo.apiKey}))
				).catch( (err) ->
					#serious error
					console.log(err)
					thisClient.ws.send(errMsg('login' ,'126'))
				)
				return;
			)
			return

		if (@user && message.type)
			if (listeners[message.type])
				for listener in listeners[message.type]
					listener(message,thisClient)
			switch(message.type)
				when "getMap"
					@ws.send(
						JSON.stringify({
							type: 'planet',
							planet: {
								grid: @planet.grid,
								navGrid: @planet.navGrid,
								water: @planet.water,
								settings: @planet.settings,
								worldSettings: @planet.worldSettings,
								users: @planet.users
							}
						})
					)

				when "spawn"
					@planet.getPlayersUnits(@userInfo.id).then((unitList) ->
						if (unitList.length > 0)
							console.log('player already spawned: ' + thisClient.userInfo.username)
							thisClient.ws.send(errMsg('spawn', 'already have units!'))
							return;

						thisClient.planet.spawnPlayer(thisClient.userInfo.id).then(() ->
							console.log('spawned player ' + thisClient.userInfo.username)
							thisClient.ws.send(success('spawn'))
							)

					).catch((err) ->
						console.log(err)
						thisClient.ws.send(errMsg('spawn', 'failed to spawn units'))
					)
				when "getUnits"
					@ws.send(success('units', {units: @planet.units}))
					@ws.send(success('unitBalance', {units: Units.Units}))
				when "getPlayers"
					@ws.send(success('players', {players: sanitizePlayerList(@planet.players)}))
				when "setDestination"
					if (!message.unitId)
						return @ws.send(errMsg('setDestination', 'no unit specified'))
					if (!message.location)
						return @ws.send(errMsg('setDestination', 'no location set'))
					if (@planet.updateUnitDestination(@userInfo.id,message.unitId,message.location))
						@ws.send(success('setDestination'))
					else
						@ws.send(errMsg('setDestination', 'invalid'))
				when "attack"
					@ws.send(errMsg('attack', 'not implimented'))
				else
					if (!listeners[message.type])
						console.log('unknown type recieved: ' + message.type)
						@ws.send(errMsg('invalid', 'invalid type for request'))

			return

		@ws.send(errMsg('invalid', 'invalid request'))

success = (type,data) ->
	if (data)
		data.type = type;
		data.success = true;
		return JSON.stringify(data)
	else
		return JSON.stringify({ type: type, success: true})
exports.success = success

errMsg = (type,errMsg) ->
	return JSON.stringify({ type: type, success: false, reason: errMsg})
exports.errMsg = errMsg

sanitizePlayerList = (playerList) ->
	newList = []
	for user in playerList
		newList.push( {
			_id: user._id
			username: user.username
			color: user.color
		})

	return newList


exports.success = success
exports.errMsg = errMsg

#TODO setup everything for ssl
exports.init = (port) ->
	wss = new WebSocketServer({port: port})
	wss.on('connection',(ws) ->
		new client(ws)
		)

	#TODO should probably be moved somewhere else
	app = require("./app.js")

#TODO close server on exit
#wss.close()