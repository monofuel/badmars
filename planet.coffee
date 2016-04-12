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
        unit.totalAttempts = 0
        if (!unit.owner)
          continue

        db.getUserById(unit.owner).then((playerInfo) ->
          #TODO: lots of undocumented fields added to unit at runtime. should refactor
          unit.player = playerInfo
          for player in thisPlanet.players
            if (playerInfo._id + "" == player._id + "")
              return
          thisPlanet.players.push(playerInfo)
        ).catch((err) ->
          console.log(err)
        )

      thisPlanet.units = unitList
      console.log('unit count: ',unitList.length)
      if (unitList.length == 0)
        thisPlanet.spawnResources()
        console.log('unit count: ',unitList.length)
      return thisPlanet;
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
              unit.tile = new PlanetLoc(thisPlanet,unit.location[0],unit.location[1])
              unit.totalAttempts = 0
              thisPlanet.units.push(iron)
            )

    for x in [0..@worldSettings.size - 2]
      for y in [0..@worldSettings.size - 2]
        if (Math.random() < @worldSettings.oilChance)
          tile = new PlanetLoc(this,x,y)
          if (tile.type == TileType.land)
            db.createUnit(tile,"oil")
            .then((oil) ->
              #TODO: lots of undocumented fields added to unit at runtime. should refactor
              unit.tile = new PlanetLoc(thisPlanet,unit.location[0],unit.location[1])
              unit.totalAttempts = 0
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
      db.getUserById(userId).then((playerInfo) ->
        thisPlanet.players.push(playerInfo)
        for player in thisPlanet.players
          Net.sendMessage(player,{ type: 'players', players: thisPlanet.players});

      ).then(() ->
        goodArea = false
        while (!goodArea)
          x = Math.random() * thisPlanet.worldSettings.size;
          y = Math.random() * thisPlanet.worldSettings.size;

          console.log('scanning for potential spawn')
          goodArea = true
          for x2 in [0..6]
            for y2 in [0..6]
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
        console.log('found a good area to spawn')
        buildings = [
          thisPlanet.createUnit('storage',new PlanetLoc(thisPlanet,x + 3, y + 3),userId),
          thisPlanet.createUnit('builder',new PlanetLoc(thisPlanet,x + 1, y + 2),userId),
          thisPlanet.createUnit('builder',new PlanetLoc(thisPlanet,x + 1, y + 3),userId),
          thisPlanet.createUnit('tank',new PlanetLoc(thisPlanet,x + 5, y + 2),userId),
          thisPlanet.createUnit('tank',new PlanetLoc(thisPlanet,x + 5, y + 3),userId),
          thisPlanet.createUnit('iron',new PlanetLoc(thisPlanet,x, y),userId),
          thisPlanet.createUnit('oil',new PlanetLoc(thisPlanet,x + 5, y + 5),userId),
          thisPlanet.createUnit('mine',new PlanetLoc(thisPlanet,x, y),userId),
          thisPlanet.createUnit('mine',new PlanetLoc(thisPlanet,x + 5, y + 5),userId),
        ]
        Promise.all(buildings).then( (units) ->
          for unit in units
            switch(unit.type)
              when 'storage'
                unit.iron = 1000
                unit.oil = 1000
              when 'tank'
                unit.oil = 50
              when 'builder'
                unit.oil = 50
            unit.save()
          console.log('spawning finished')
          resolve();
        )
      )
    )

  createUnit: (type, tile,userId) ->
    if (!type)
      throw new Error('invalid unit type')
    if (!tile)
      throw new Error('invalid tile')
    if (!userId)
      console.log('creating unit without user')

    console.log('spawning ' + type)
    thisPlanet = this
    return db.createUnit(tile,type,userId,false).then((unit) ->
      unit.tile = tile
      console.log('spawned ' + ' for player: ', userId)
      thisPlanet.units.push(unit)
      db.getUserById(userId).then((playerInfo) ->
        thisPlanet.broadcastUpdate({
          type: "newUnit"
          unit: unit
          player: playerInfo
          });
      )
      return unit
    ).catch((error) ->
      console.log(error)
    )

  unitTileCheck: (tile) ->
    for unit in @units
      if (unit.type == 'storage') #TODO refactor multi-tile units
        if (tile.equals(unit.tile) ||
           tile.N().equals(unit.tile) ||
           tile.S().equals(unit.tile) ||
           tile.E().equals(unit.tile) ||
           tile.W().equals(unit.tile) ||
           tile.E().N().equals(unit.tile) ||
           tile.E().S().equals(unit.tile) ||
           tile.W().N().equals(unit.tile) ||
           tile.W().S().equals(unit.tile))
         return unit

      if (tile.equals(unit.tile) || (tile.equals(unit.nextTile) && unit.moving))
        return unit

    return null

  # @param [Unit] unit the unit to compare to
  # @return [Unit]
  getNearestEnemy: (unit) ->

    #assume all users are enemies.
    #TODO faction or enemy/ally system thing
    distance = null
    nearestEnemy = null
    for otherUnit in @units
      if (otherUnit.owner != unit.owner && otherUnit.type != 'oil' && otherUnit.type != 'iron')
        otherUnitDistance = unit.tile.distance(otherUnit.tile);
        if (!nearestEnemy || otherUnitDistance < distance)
          nearestEnemy = otherUnit
          distance = otherUnitDistance

    return nearestEnemy

  killUnit: (unit) ->
    index = @units.indexOf(unit)
    if (index > -1)
      @units.splice(index, 1);
    db.removeUnit(unit.id);

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

  update: () ->

    if (@units)
      for unit in @units
        try
          Units.updateUnit(unit)
        catch error
          Logger.error(error)



module.exports = Planet
