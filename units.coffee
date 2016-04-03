'use strict';
mongoose = require('mongoose')
users = require('./util/users')
Planet = mongoose.model('Planet')
TileType = require('./tileType')
Nav = require('./nav')
direction = require('./direction')
PlanetLoc = require('./PlanetLoc')
BadMars = require('./badMars.js')
Logger = require('./util/logger.js')
fs = require('fs')

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

Units = JSON.parse(fs.readFileSync('./units.json'));
module.exports.Units = Units

fs.watchFile('./units.json', () ->
  console.log("units.json updated, reloading");
  fs.readFile('./units.json', (err,data) ->
    Units = JSON.parse(data);
    module.exports.Units = Units
    for planet in BadMars.planetList
      planet.broadcastUpdate({
        type: "unitBalance",
        units: Units
        });
    console.log("new unit data broadcast");
    )
  )

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

# simulate 1 server tick on a unit
# @param [Unit] unit the unit to update
# @return [Promise]
exports.updateUnit = (unit) ->

  ticksPerSec = BadMars.ticksPerSec

  if (!unit)
    #TODO refactor this
    #hacky fix for when units are deleted during a simulation tick
    return

  #rather messy. unit is the instance of a unit, unitInfo is mmetadata for the specific type of unit.
  #this should be refactored.
  #TODO: this function should be refactored as i get a better idea of how to lay things out

  #bool for if we want to save updates back to DB
  update = false
  unitInfo = exports.get(unit.type)
  planet = unit.tile.planet

  #TODO: this sets the units default health. this should be coded better
  if (!unit.health)
    unit.health = unitInfo.maxHealth

  if (unitInfo && unit.destination && unit.destination.length == 2)
    dest = new PlanetLoc(planet, unit.destination[0], unit.destination[1])

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
        if (planet.unitTileCheck(unit.nextTile) == null)
          unit.moving = true;
          planet.broadcastUpdate({
            type: "moving"
            unitId: unit.id
            newLocation: [unit.nextTile.x,unit.nextTile.y]
            time: unitInfo.speed / ticksPerSec
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


  #cooldown after firing
  #TODO unitInfo is checked as some units dont' have unit info (maybe should so something about that)
  if (unitInfo && unitInfo.firePower) #unitInfo.firePower is a little bit hacky of a way to see if a unit can shoot
    if (!unit.fireCooldown)
      unit.fireCooldown = 0
    else if (unit.fireCooldown > 0)
      update = true
      unit.fireCooldown--
    else if (unit.fireCooldown < 0)
      update = true
      unit.fireCooldown = 0

  if (unitInfo && unitInfo.firePower && unit.fireCooldown == 0 && !unit.moving)
    #check for an enemy to shoot
    enemy = planet.getNearestEnemy(unit)
    if (enemy && enemy.tile.distance(unit.tile) < unitInfo.range)
      update = true;
      #SHOOT THEM
      unit.fireCooldown = unitInfo.fireRate
      enemy.health -= unitInfo.firePower
      Logger.serverInfo("auto_attack",{
        unit: unit
        enemy: enemy
        distance: enemy.tile.distance(unit.tile)
        })
      if (enemy.health <= 0)
        planet.broadcastUpdate({
          type: "kill"
          unitId: unit.id
          enemyId: enemy.id
          });
        planet.killUnit(enemy)
      else
        planet.broadcastUpdate({
          type: "attack"
          unitId: unit.id
          enemyId: enemy.id
          enemyHealth: enemy.health
          });
        #TODO we are saving a unit other than the one currently being simulated. this is odd.
        enemy.save()



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
