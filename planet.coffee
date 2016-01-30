#Monofuel
'use strict';
db = require("./db.js");
Units = require('./units.js')
PlanetLoc = require('./PlanetLoc.js')

class Planet
  constructor: (@planetName) ->
    if (!@planetName)
      console.log('planet must be constructed with a name')
      return

  init: () ->

    thisPlanet = this

    return db.getPlanet(@planetName)
    .then((planetData) ->
      thisPlanet.planetData = planetData
      return db.getWorld(planetData.world)
    ).then((worldData) ->
      thisPlanet.worldName = worldData.name
      thisPlanet.water = worldData.water
      thisPlanet.grid = worldData.vertex_grid
      thisPlanet.navGrid = worldData.movement_grid
      thisPlanet.settings = worldData.settings
      #TODO load units
      return db.listUnits(thisPlanet.planetName)
    ).then((unitList) ->
      thisPlanet.units = unitList
    ).catch((err) ->
      console.log('failed to load planet')
      console.log(err)
    )
  spawnResources: () ->


  update: (delta) ->
    for unit in @units
      Units.updateUnit(unit,delta)
    #console.log(@planetName,", delta:",delta)

module.exports = Planet
