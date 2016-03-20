'use strict';
mongoose = require('mongoose')
users = require('./util/users')
Planet = mongoose.model('Planet')
TileType = require('./tileType')
Nav = require('./nav')
direction = require('./direction')
PlanetLoc = require('./PlanetLoc')
#---------------------------------------------------------------------

#list of units
#
#name of unit
#range of attack in tiles
#speed of unit in ticks per second (tick rate is 20/s)
#total hp of unit
#attack power of unit
#cost of the unit
#



Units = [
  {
    name: 'tank',
    range: 5.0,
    speed: 10,
    hp: 50,
    attack: 10,
    cost: 500,
    fireRate: 20
    firePower: 15
    type: 'ground'
  },{
    name: 'scout',
    range: 5.0,
    speed: 3,
    hp: 20,
    attack: 2,
    fireRate: 10
    firePower: 2
    cost: 100,
    type: 'ground'
  },{
    name: 'builder',
    range: 1.0,
    speed: 15,
    hp: 100,
    attack: 0,
    cost: 300,
    type: 'ground'
  },{
    name: 'transport',
    range: 1.0,
    speed: 18,
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
exports.updateUnit = (unit) ->

  #bool for if we want to save updates back to DB
  update = false
  unitInfo = exports.get(unit.type)

  if (unitInfo && unit.destination && unit.destination.length == 2)
    dest = new PlanetLoc(unit.tile.planet, unit.destination[0], unit.destination[1])

    #clear properties if our tile is the destination
    if (unit.tile.equals(dest))
      unit.destination = []
      unit.nextMove = direction.c
      unit.nextTile = null
      unit.path = null
      unit.moving = false
      unit.totalAttempts = 0

    else
      if (unit.path && !unit.path.end.equals(dest))
        console.log('pathing for new destination')
        unit.totalAttempts = 0

      #if we have no destination, set it
      #or update it if we have a new destination
      #or re-path if we have waited to move for too long
      if (!unit.path || !unit.path.end.equals(dest) || unit.moveAttempts > 8)

        unit.path = new Nav.AStarPath(unit.tile,dest)
        unit.distanceMoved = 0
        console.log('updating path')
        update = true
        unit.moveAttempts = 0

        #can't find a way after re-pathfing 5 times, give up.
        if (unit.totalAttempts++ > 5)
          console.log('giving up on pathing')
          unit.destination = unit.location


      #dont' mess with things if we are stil moving
      if (!unit.moving)
        unit.nextMove = unit.path.getNext(unit.tile)
        switch(unit.nextMove)
          #TODO should check if another unit is here
          when direction.N
            unit.nextTile = unit.tile.N();
          when direction.S
            unit.nextTile = unit.tile.S();
          when direction.E
            unit.nextTile = unit.tile.E();
          when direction.W
            unit.nextTile = unit.tile.W();
          else
            unit.nextTile = unit.tile

        #check if a unit is blocking the next tile
        if (unit.tile.planet.unitTileCheck(unit.nextTile) == null)
          unit.moving = true;
          unit.tile.planet.broadcastUpdate({
            type: "moving"
            unitId: unit.id
            newLocation: [unit.nextTile.x,unit.nextTile.y]
            time: 1 / unitInfo.speed
            });
        else
          unit.moveAttempts++

      deltaMove = 1 / unitInfo.speed
      if (unit.nextMove != direction.C && unit.moving)
        unit.moving = true
        unit.distanceMoved += deltaMove
        if (unit.distanceMoved > 1)
          unit.distanceMoved = 1

      if (unit.distanceMoved == 1)
        unit.moving = false
        unit.tile = unit.nextTile
        unit.distanceMoved = 0
        update = true
        unit.moveAttempts = 0

  #@todo
  #update info on the unit
  #unitSchema =
  #  type: String
  #  constructing: Number
  #  location: [Number]
  #  planet: String
  unit.location = [unit.tile.x, unit.tile.y]

  if (update)
    return unit.save()
    .catch((err) ->
      console.log(err)
      )
  else
    return null

#check if a unit is blocking the tile
#@param [PlanetLoc] tile tile on the map to check for unit
#@return [Boolean] if the tile is blocked
exports.unitTileCheck = (tile) ->
  for unit in tile.planet.units
    #if single tile unit:
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
