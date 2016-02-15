#Monofuel
'use strict';

WebSocketServer = require('ws').Server
BadMars = require('./badMars.js')
Units = require('./units.js')
db = require('./db.js')

clientList = []
exports.clientList = clientList

exports.sendMessage = (player, data) ->
  for client in clientList
    if (client.userInfo.id == player.id)
      try
        client.send(data)
      catch error
        console.log('error sending: ',error)




class client
  constructor: (@ws) ->

    thisClient = this;
    clientList.push(this)

    ws.on('message',(msg) ->
      thisClient.handleFromClient(msg)
      )
    ws.on('error',(message) ->
      console.log('ws error: ' + message)
      )

    ws.on('close', () ->
      console.log("client closed connection")
      clientList.splice(clientList.indexOf(thisClient),1)
      )
    ws.send(JSON.stringify({status: "connected"}))



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
    if (message.login)
      if (!message.login.planet)
        @ws.send(JSON.stringify({ login: 'error: specify a planet'}))
        return
      if (!message.login.username)
        @ws.send(JSON.stringify({ login: 'error: invalid username'}))
        return
      if (!message.login.color)
        @ws.send(JSON.stringify({ login: 'error: please specify a color'}))
        return

      @user = message.login.username
      for planet in BadMars.planetList
        if planet.name == message.login.planet
          @planet = planet
      if (@planet)
        console.log('looking up user: ' + message.login.username);

        db.getUserByName(message.login.username)
        .then( (userInfo) ->
          thisClient.userInfo = userInfo;
          console.log('logging in user: ' + userInfo.username);
          thisClient.ws.send(JSON.stringify({ login: 'success'}))
          return;
        ).catch( (err) ->
          console.log(err)
          console.log('creating new user');
          db.createUser(message.login.username, message.login.color)
          .then( (userInfo) ->
            thisClient.userInfo = userInfo;
            console.log('account created for user: ' + userInfo.username);
            thisClient.ws.send(JSON.stringify({ login: 'account created'}))
          ).catch( () ->
            @thisClient.ws.send(JSON.stringify({ login: 'error: server error 126'}))
          )
          return;
        )

        return;
      else
        @ws.send(JSON.stringify({ login: 'error: invalid planet'}))
      return

    if (@user && message.type)
      switch(message.type)
        when "getMap"
          @ws.send(
            JSON.stringify(
              { planet: {
                  grid: @planet.grid,
                  navGrid: @planet.navGrid,
                  water: @planet.water,
                  settings: @planet.settings,
                  worldSettings: @planet.worldSettings,
                  users: @planet.users
                }
              }
            )
          )

        when "spawn"
          @planet.getPlayersUnits(@userInfo.id).then((unitList) ->
            console.log('spawning player ' + thisClient.userInfo.username)
            if (unitList.length > 0)
              thisClient.ws.send(JSON.stringify({ error: 'already have units!'}))
              return;

            thisClient.planet.spawnPlayer(thisClient.userInfo.id).then(() ->
              console.log('spawned player ' + thisClient.userInfo.username)
              thisClient.ws.send(JSON.stringify({ spawn: 'success!'}))
              )

          ).catch((err) ->
            console.log(err)
            thisClient.ws.send(JSON.stringify({ error: 'failed to spawn units'}))
          )
        when "getUnits"
          @ws.send(JSON.stringify({ units: @planet.units}))
        when "getPlayers"
          @ws.send(JSON.stringify({ players: @planet.players}))
        when "setDestination"
          if (!message.unitId)
            return @ws.send(JSON.stringify({ setDestination: 'error: no unit specified'}))
          if (!message.location)
            return @ws.send(JSON.stringify({ setDestination: 'error: no location set'}))
          if (@planet.updateUnitDestination(@userInfo.id,message.unitId,message.location))
            @ws.send(JSON.stringify({ setDestination: 'success'}))
          else
            @ws.send(JSON.stringify({ setDestination: 'error: invalid'}))
        when "attack"
          @ws.send(JSON.stringify({ error: 'not implimented'}))
        else
          @ws.send(JSON.stringify({ error: 'invalid request type'}))

      return

    @ws.send(JSON.stringify({ error: "command not found"}))

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
