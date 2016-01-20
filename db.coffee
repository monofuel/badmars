#Monofuel
'use strict';

mongoose = require('mongoose')
Mixed = mongoose.Schema.Types.Mixed
mongoose.Promise = global.Promise;
exports.Ready = false

#------------------------------------------------------------
#TODO: all schemas should be moved to models/ for organizing

#object definitions
worldSchema = mongoose.Schema({
  name: String
  water: Number
  vertex_grid: Mixed
  movement_grid: Mixed
  settings: Mixed
})

resourceSchema = mongoose.Schema({
  type: String
  rate: Number
  location: [Number]
})

buildingSchema = mongoose.Schema({
  type: String
  rate: Number
  location: [Number]
  construct_queue: [String]
  Owner: String
})

unitSchema = mongoose.Schema({
  type: String
  rate: Number
  constructing: String
  location: [Number]
})

World = mongoose.model('World',worldSchema)
Resource = mongoose.model('Resource',resourceSchema)
Building = mongoose.model('Building',buildingSchema)
Unit = mongoose.model('Unit',unitSchema)

factionSchema = mongoose.Schema({
  name: String
  users: [String]
  world: String
})

Faction = mongoose.model('Faction',factionSchema)

planetSchema = mongoose.Schema({
  name: String
  world: String
  users: [String] #array of _id's for users in the japura/users table
  settings: Mixed
})

Planet = mongoose.model('Planet',planetSchema);

#------------------------------------------------------------

exports.init = () ->
  #TODO should retry if connection is lost or fails to connect
  mongoose.connect('mongodb://localhost/badMars')
  db = mongoose.connection
  db.on('error',console.error.bind(console,'mongo connection error: '))

  db.once('open', (callback) ->
    exports.Ready = true
  )

#------------------------------------------------------------
#map stuff (worlds)
exports.saveWorld = (world) ->
  worldDoc = new World(world)
  worldDoc.save( (err,badMars) ->
    console.error(err) if (err)
  )

exports.removeWorld = (name) ->

  World.remove({ name: name},(err,world) ->
    if (err)
      return console.error(err)
    console.log(name, " deleted")
  )

# [String] name of the world to get
# @return [Promise]
exports.getWorld = (name) ->
  return World.findOne({ name: name});

exports.listWorlds = (listFunc) ->
  worldNames = new Array()
  World.find((err,worlds) ->
    if (err)
      return console.error(err)
    for world in worlds
      worldNames.push(world.name)
    listFunc(worldNames)
  )

#------------------------------------------------------------
#planet stuff (instances of worlds)

# @param [String] name the name of the planet to create
# @param [String] name the name of the map to use
# @return [Promise]
exports.createPlanet = (planetName, worldName) ->
  return new Promise ((resolve,reject) ->
    World.find({name: worldName})
    .then((world) ->
      planet = new Planet();
      planet.name = planetName;
      planet.world = worldName;
      planet.save()
      .then((planet) ->
        console.log('planet created successfully');
        return resolve();

      )
      .catch(reject)


    )
    .catch(reject)
  )

exports.removePlanet = (name) ->

  Planet.remove({ name: name},(err,planet) ->
    if (err)
      return console.error(err)
    console.log(name, " deleted")
  )

# [String] name of the planet to get
# @return [Promise]
exports.getPlanet = (name) ->
  return Planet.findOne({ name: name});

exports.listPlanets = (listFunc) ->
  planetNames = new Array()
  Planet.find((err,planets) ->
    if (err)
      return console.error(err)
    for planet in planets
      planetNames.push(planet.name)
    listFunc(planetNames)
  )
