#Monofuel
'use strict';
db = require("./db.js");
Units = require('./units.js')
PlanetLoc = require('./PlanetLoc.js')
TileType = require('./tileType')
Net = require('./net')


class Planet

  constructor: (@name) ->
    if (!@name)
      console.log('planet must be constructed with a name')
      return

  init: () ->

    thisPlanet = this #to avoid issues with promise callbacks

    return db.getPlanet(@name)
    .then((planetData) ->
      thisPlanet.planetData = planetData
      thisPlanet.id = planetData.id
      thisPlanet.users = planetData.users
      thisPlanet.settings = planetData.settings
      if (!thisPlanet.settings)
        thisPlanet.settings = {}
      console.log('loading planet: ',thisPlanet.name,' world: ',planetData.world);
      return db.getWorld(planetData.world)
    ).then((worldData) ->

      #pick and choose what info we want
      thisPlanet.worldName = worldData.name
      thisPlanet.water = worldData.water
      thisPlanet.grid = worldData.vertex_grid
      thisPlanet.navGrid = worldData.movement_grid
      thisPlanet.worldSettings = worldData.settings
      if (!thisPlanet.worldSettings)
        thisPlanet.worldSettings = {}

      return db.listUnits(thisPlanet.name)
    ).then((unitList) ->
      thisPlanet.players = []
      for unit in unitList
        unit.tile = new PlanetLoc(thisPlanet,unit.location[0],unit.location[1])
        if (!unit.owner)
          continue

        db.getUserById(unit.owner).then((playerInfo) ->
          ownerInList = false
          for player in thisPlanet.players
            if (player.id == unit.owner)
              ownerInList = true
          if (!ownerInList)
            thisPlanet.players.push(playerInfo)
          ).catch((err) ->
            console.log(err)
          )

      thisPlanet.units = unitList
      console.log('unit count: ',unitList.length)
      if (unitList.length == 0)
        thisPlanet.spawnResources()
        console.log('unit count: ',unitList.length)

    ).catch((err) ->
      console.log('failed to load planet')
      console.log(err)
    )

  spawnResources: () ->
    thisPlanet = this #to avoid issues with promise callbacks
    console.log('spawning resources for ',@name)

    for x in [0..@worldSettings.size - 2]
      for y in [0..@worldSettings.size - 2]
        if (Math.random() < @worldSettings.ironChance)
          tile = new PlanetLoc(this,x,y)
          if (tile.type == TileType.land)
            db.createUnit(tile,"iron")
            .then((iron) ->
              thisPlanet.units.push(iron)
            )

    for x in [0..@worldSettings.size - 2]
      for y in [0..@worldSettings.size - 2]
        if (Math.random() < @worldSettings.oilChance)
          tile = new PlanetLoc(this,x,y)
          if (tile.type == TileType.land)
            db.createUnit(tile,"oil")
            .then((oil) ->
              thisPlanet.units.push(oil)
            )

  getPlayersUnits: (userId) ->
    return db.listUnitsByUserId(userId)

  getUnitById: (unitId) ->
    for unit in @units
      if (unit.id == unitId)
        return unit
    return null;

  spawnPlayer: (userId) ->
    thisPlanet = this;
    return new Promise((resolve,reject) ->
      tanksToSpawn = 5;
      while (tanksToSpawn > 0)
        x = Math.random() * thisPlanet.worldSettings.size;
        y = Math.random() * thisPlanet.worldSettings.size;

        console.log('scanning for potential spawn')
        goodArea = true
        for x2 in [0..10]
          for y2 in [0..10]
            tile = new PlanetLoc(thisPlanet,x + x2, y + y2)
            if (tile.type != TileType.land)
              goodArea = false
              break
            if (Units.unitTileCheck(tile))
              goodArea = false
              break
          if (!goodArea)
            break
        if (!goodArea)
          continue

        console.log('found a good area to spawn!')
        while (tanksToSpawn > 0)
          x2 = Math.random() * 10
          y2 = Math.random() * 10
          tile = new PlanetLoc(thisPlanet,x + x2, y + y2)
          if (tile.type != TileType.land)
            continue
          if (Units.unitTileCheck(tile))
            continue
          tanksToSpawn--;
          db.createUnit(tile,'tank',userId,false).then((unit) ->
            console.log('spawned tank for player: ', userId)
            thisPlanet.units.push(unit)
          )


      resolve();
      )

  unitTileCheck: (tile) ->
    console.log('unit tile check stub')

  broadcastUpdate: (data) ->
    for player in @players
      Net.sendMessage(player,data);


  updateUnitDestination: (userId,unitId,destination) ->
    unit = @getUnitById(unitId);
    if (!unit)
      console.log('invalid unit in move request')
      return false
    if (unit.owner != userId)
      console.log('player ordered other players unit to move')
      return false

    unit.destination = destination
    console.log('set unit destination')
    return true

  update: (delta) ->
    if (@units)
      for unit in @units
        Units.updateUnit(unit,delta)

module.exports = Planet
