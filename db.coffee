#Monofuel
'use strict';

mongoose = require('mongoose')
hat = require('hat')
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
  health: { type: Number, default: 100}
  constructing: Number
  location: [Number]
  planet: {type: String, index: true}
  owner: String
  destination: [Number]
})

World = mongoose.model('World',worldSchema)
Resource = mongoose.model('Resource',resourceSchema)
Building = mongoose.model('Building',buildingSchema)
Unit = mongoose.model('Unit',unitSchema)

userSchema = mongoose.Schema( {
  username: String
  user_id: String #user ID in japura user database
  apiKey: String
  color: String #hex color string
  })

User = mongoose.model('User',userSchema)

factionSchema = mongoose.Schema({
  name: String
  users: [String]
  world: String
})

Faction = mongoose.model('Faction',factionSchema)

planetSchema = mongoose.Schema({
  name: String
  world: String
  users: [String] #array of _id's for users
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

#------------------------------------------------------------
#user stuff
exports.createUser = (username, userColor) ->
  user = new User();
  user.username = username;
  user.color = userColor;
  user.apiKey = hat()
  return user.save()

exports.getUserByName = (username) ->
  return User.findOne({username: username});

exports.getUserById = (userId) ->
  return User.findById(userId);

#------------------------------------------------------------
#Unit stuff

# @param [PlanetLoc] tile
# @param [String] unitType the type of unit to create
# @return [Promise]
exports.createUnit = (tile,unitType,owner,unfinished) ->

  unitData = {
    type: unitType
    location: [tile.x,tile.y]
    planet: tile.planet.name
    owner: owner
  }
  if (unfinished)
    unitData.constructing = 0;
  #@todo error check unit type

  unitDoc = new Unit(unitData)
  return unitDoc.save()
  .catch((err) ->
    console.log(err)
  )

# @param [Unit] unit the unit to save
# @return [Promise]
exports.updateUnit = (unit) ->
  return unit.save()

# @param [String] id unique unit id
# @return [Promise]
exports.removeUnit = (unitId) ->
  return Unit.removeById(unitId)
  .then(() ->
    console.log('unit deleted')
  ).catch((err) ->
    console.log(err)
  )


# @param [String] id unique unit id
# @return [Promise]
exports.getUnit = (unitId) ->
  return Unit.findById(unitId);

# @param [String] planetName name of the planet to get units for
# @return [Promise]
exports.listUnits = (planetName) ->
  return Unit.find({planet: planetName})

exports.listUnitsByUserId = (userId) ->
  return Unit.find({owner: userId});
