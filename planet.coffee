#Monofuel
'use strict';
db = require("./db.js");
Units = require('./units.js')
PlanetLoc = require('./PlanetLoc.js')
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
      for unit in unitList
        unit.tile = new PlanetLoc(thisPlanet,unit.location[0],unit.location[1])

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
          db.createUnit(tile,"iron")
          .then((iron) ->
            thisPlanet.units.push(iron)
          )

    for x in [0..@worldSettings.size - 2]
      for y in [0..@worldSettings.size - 2]
        if (Math.random() < @worldSettings.oilChance)
          tile = new PlanetLoc(this,x,y)
          db.createUnit(tile,"oil")
          .then((oil) ->
            thisPlanet.units.push(oil)
          )

  update: (delta) ->
    if (@units)
      for unit in @units
        Units.updateUnit(unit,delta)
    #console.log(@name,", delta:",delta)

module.exports = Planet
