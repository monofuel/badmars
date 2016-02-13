WebSocketServer = require('ws').Server
BadMars = require('./badMars.js')
Units = require('./units.js')

clientList = []
exports.clientList = clientList

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
      clientList.splice(clientList.indexOf(this),1)
      )
    ws.send(JSON.stringify({status: "connected"}))

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
    console.log('recieved: ' + message)
    message = JSON.parse(message);
    if (message.login)
      if (!message.login.planet)
        @ws.send(JSON.stringify({ login: 'error: specify a planet'}))
        return
      if (!message.login.username)
        @ws.send(JSON.stringify({ login: 'error: invalid username'}))
        return

      @user = message.login.username
      for planet in BadMars.planetList
        if planet.name == message.login.planet
          @planet = planet
      if (@planet)
        @ws.send(JSON.stringify({ login: 'success'}))
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
          @ws.send(JSON.stringify({ error: 'not implimented'}))
        when "getUnits"
          @ws.send(JSON.stringify({ error: 'not implimented'}))
        when "setDestination"
          @ws.send(JSON.stringify({ error: 'not implimented'}))
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
