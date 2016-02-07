'use strict';
mongoose = require('mongoose')
users = require('./util/users')
Planet = mongoose.model('Planet')
TileType = require('./tileType')
nav = require('./nav')

#---------------------------------------------------------------------

#list of units
#
#name of unit
#range of attack in tiles
#speed of unit in tiles per second
#total hp of unit
#attack power of unit
#cost of the unit
#



Units = [
  {
    name: 'tank',
    range: 5.0,
    speed: 1.0,
    hp: 50,
    attack: 10,
    cost: 500,
    type: 'ground'
  },{
    name: 'scout',
    range: 5.0,
    speed: 4.0,
    hp: 20,
    attack: 2,
    cost: 100,
    type: 'ground'
  },{
    name: 'builder',
    range: 1.0,
    speed: 1.2,
    hp: 100,
    attack: 0,
    cost: 300,
    type: 'ground'
  },{
    name: 'transport',
    range: 1.0,
    speed: 1.0,
    hp: 300,
    attack: 0,
    cost: 200,
    type: 'ground'
  }
]

#TODO: this might need to be re-done as a hashmap
exports.get = (name) ->
  for item in Units
    if item.name == name
      return item

exports.list = () ->
  list = []
  for item in Units
    list.push(item.name)
  return list

# @param [Unit] unit the unit to update
# @param [Number] delta time since last update
# @return [Promise]
exports.updateUnit = (unit,delta) ->

  #bool for if we want to save updates back to DB
  update = true

  #if (unit.destination)



  #@todo
  #update info on the unit
  #unitSchema =
  #  type: String
  #  constructing: Number
  #  location: [Number]
  #  planet: String

  if (update)
    return unit.save()
  else
    return null

#check if a unit is blocking the tile
#@param [PlanetLoc] tile tile on the map to check for unit
#@return [Boolean] if the tile is blocked
unitTileCheck = (tile) ->
  for unit in tile.planet.units
    if (unit.type == 'tank')
      if tile.equals(unit.tile)
        return true
    #if (unit.type == 'storage')
      #TODO fancy thing for multi tile units
  return false

#superclass for all units in the game world with a location and a mesh
class entity
  #@property [String] type the type of unit
  type: 'entity'
  #@property [String] owner the owner of the unit
  owner: 'admin'

  constructor: (@data, planet) ->



exports.spawnPlayer = (userId, planet) ->
  userDoc = null;

  return users.getUserDoc(userId)
  .then((doc) ->
    userDoc = doc;
    if (!userDoc)
      #very bad error, possibly hints at an issue with authentication
      err = new Error('no such user found');
      logger.error(err);
      throw err;

    console.log('requested spawn for ',userDoc.username,'and planet',planetDoc.name);
    #TODO actually spawn the user in
  )
