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
Net = require('./net.js')
fs = require('fs')
db = require("./db.js");

ASTAR_MAX = 100

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
    #TODO only send units that change
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
get = exports.get

exports.list = () ->
  list = []
  for item in Units
    list.push(item.name)
  return list

Net.registerListener('createGhost', (data,client) ->
  unitInfo = get(data.unitType);
  if (!unitInfo)
    client.send(Net.errMsg('createGhost','missing unitType field'));
    return
  if (!data.location)
    client.send(Net.errMsg('createGhost','missing location field'));
    return

  tile = new PlanetLoc(client.planet,data.location[0],data.location[1])
  if(!client.planet.checkValidForUnit(tile,unitInfo.name))
    client.send(Net.errMsg('createGhost','invalid location'));
    return;

  db.createUnit(tile,unitInfo.name,client.userInfo._id,true)
    .then((ghost) ->
      ghost.tile = tile;
      ghost.totalAttempts = 0
      ghost.health = unitInfo.maxHealth
      tile.planet.units.push(ghost)
      console.log('creating ghost unit')
      client.send({type: 'createGhost',unit: ghost});
    )
  )

Net.registerListener('factoryOrder', (data,client) ->
  # {type:'factoryOrder',factory:selectedUnit.uid, unitType:unitType}
  unitInfo = get(data.unitType);
  if (!unitInfo)
    client.send(Net.errMsg('factoryOrder','missing unitType field'));
    return
  if (!data.factory)
    client.send(Net.errMsg('factoryOrder','missing factory field'));
    return

  factory = client.planet.getUnitById(data.factory)
  if (!factory || factory.type != 'factory')
    client.send(Net.errMsg('factoryOrder','invalid factory'));
    return;

  if (!factory.factoryQueue)
    factory.factoryQueue = []
  console.log('pushing ' + unitInfo.name + ' to queue');
  factory.factoryQueue.push({
    remaining: unitInfo.buildTime
    type: unitInfo.name
    cost: unitInfo.cost
    });
  factory.save()

)

# simulate 1 server tick on a unit
# @param [Unit] unit the unit to update
# @return [Promise]
exports.updateUnit = (unit) ->

  ticksPerSec = BadMars.ticksPerSec

  if (!unit)
    #TODO refactor this
    #hacky fix for when units are deleted during a simulation tick
    return

  if (!unit.iron)
    unit.iron = 0
  if (!unit.oil)
    unit.oil = 0

  if (unit.ghosting)
    return;

  #rather messy. unit is the instance of a unit, unitInfo is metadata for the specific type of unit.
  #this should be refactored.
  #TODO: this function should be refactored as i get a better idea of how to lay things out

  #bool for if we want to save updates back to DB
  update = false
  unitInfo = exports.get(unit.type)
  if (!unitInfo)
    #TODO add logging for this case.
    #ignoring as i don't want to bother fixing the db atm.
    return

  planet = unit.tile.planet

  if (unit.type == 'factory' && !unit.ghosting)
    if (!unit.factoryQueue)
      unit.factoryQueue = []
    if (unit.factoryQueue && unit.factoryQueue.length > 0)
      update = true
      if (unit.factoryQueue[0].cost > 0)
        if (planet.pullIron(unit,unit.factoryQueue[0].cost))
          console.log('paying for unit')
          unit.factoryQueue[0].cost = 0
      else
        if (unit.factoryQueue[0].remaining > 0)
          unit.factoryQueue[0].remaining--
        else
          newUnitData = unit.factoryQueue.shift()
          newTile = planet.getNearestFreeTile(unit.tile)
          console.log('units left: ', unit.factoryQueue.length)
          unit.save();
          #should send user the time until the factory completes the next unit

          db.createUnit(newTile,newUnitData.type,unit.owner,true)
            .then((newUnit) ->
              newUnitInfo = exports.get(newUnit.type)
              newUnit.tile = newTile;
              newUnit.totalAttempts = 0
              newUnit.ghosting = false
              newUnit.health = newUnitInfo.maxHealth
              newUnit.iron = 0
              newUnit.oil = 0
              newUnit.save()
              newTile.planet.units.push(newUnit)
              console.log('factory creating unit')
              newTile.planet.broadcastUpdate({type: 'updateUnits',units: [newUnit], success: true});
            ).catch((error) ->
              console.log(error)
              )


  if (unit.type == 'mine')
    if (unit.resourceCooldown == undefined)
      unit.resourceCooldown = 0
    if (unit.resourceCooldown > 0)
      unit.resourceCooldown--

    if (unit.resourceCooldown == 0)
      unit.location = [unit.tile.x, unit.tile.y]
      db.getUnitsAtLoc(unit.location).then((units) ->
        mine = unit
        #if (units.length < 2)
          #do error thing
        for tileUnit in units
          if (tileUnit.type == 'iron')
            mine.resourceCooldown = 10 * 5
            #console.log('producing iron')
            planet.produceIron(mine,20)
            mine.update = true
          if (tileUnit.type == 'oil')
            mine.resourceCooldown = 10 * 5
            #console.log('producing oil')
            planet.produceOil(mine,20)
            mine.update = true
        )
        .catch((error) ->
          console.log(error)
          )

  #TODO: this sets the units default health. this should be coded better
  if (!unit.health)
    unit.health = unitInfo.maxHealth
    unit.update = true
    planet.broadcastUpdate({
      type: "updateUnits"
      units: [unit]
      success: true
      });

  if (unit.type == 'builder')
    nearestGhost = null;
    if (!unit.ghostDestination)
      ghosts = planet.findNearestGhosts(unit);
      for ghost in ghosts
        if (!ghost.assignedBuilder)
          nearestGhost = ghost
          break
    else
      nearestGhost = unit.ghostDestination

    nearestFreeTile = null
    if (nearestGhost)
      nearestFreeTile = planet.getNearestFreeTile(nearestGhost.tile,unit,true)
    if (nearestGhost && unit.tile.equals(nearestFreeTile)) #construct if nearby
      ghostInfo = exports.get(nearestGhost.type)
      if (planet.checkValidForUnit(nearestGhost.tile,nearestGhost.type) && planet.pullIron(unit,ghostInfo.cost))
        nearestGhost.ghosting = false
        ghostInfo = exports.get(nearestGhost.type);
        nearestGhost.health = ghostInfo.maxHealth;
        unit.update = true
        delete unit.ghostDestination
        nearestGhost.save()
        planet.broadcastUpdate({
          type: "updateUnits"
          units: [nearestGhost]
          success: true
          });
        #TODO make the builder stop moving and take time to build

    #head to nearest ghost
    if ((!unit.destination || unit.destination.length == 0) && !unit.tile.equals(nearestFreeTile))
      if (nearestGhost && nearestGhost.tile.distance(unit.tile) < 30)
        console.log('builder found ghost, heading to it')
        unit.destination = [nearestFreeTile.x,nearestFreeTile.y]
        nearestGhost.assignedBuilder = unit #TODO hacky, could be better
        unit.ghostDestination = nearestGhost


  if (unitInfo && unitInfo.speed && unit.destination && unit.destination.length == 2)
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
      dest = planet.getNearestFreeTile(dest,unit)
      if (unit.path && !unit.path.end.equals(dest))
        if (unit.ghostDestination)
          delete unit.ghostDestination.assignedBuilder
          delete unit.ghostDestination
        console.log('pathing for new destination')
        unit.totalAttempts = 0

      if (unit.path && unit.path.constructor.name == 'SimplePath' && Nav.distance(unit.tile, dest) < ASTAR_MAX)
        console.log('switching from simple to A*')
        unit.path = null;

      #if we have no destination, set it
      #or update it if we have a new destination
      #or re-path if we have waited to move for too long
      if (!unit.path || !unit.path.end.equals(dest) || unit.moveAttempts > 8)

        if (Nav.distance(unit.tile, dest) > ASTAR_MAX) #avoid a* over long distances, take dumb approach.
          unit.path = new Nav.SimplePath(unit.tile,dest)
          unit.distanceMoved = 0
          console.log('updating Simple path')
          update = true
          unit.moveAttempts = 0
          #can't find a way after re-pathfing 5 times, give up.
          if (unit.totalAttempts++ > 5)
            console.log('giving up on pathing')
            unit.destination = unit.location

        else
          unit.path = new Nav.AStarPath(unit.tile,dest)
          unit.distanceMoved = 0
          console.log('updating AStar path')
          update = true
          unit.moveAttempts = 0
          #can't find a way after re-pathfing 5 times, give up.
          if (unit.totalAttempts++ > 5)
            console.log('giving up on pathing')
            unit.destination = unit.location


      #dont' mess with things if we are stil moving
      if (!unit.moving && (unit.fireCooldown == undefined || unit.fireCooldown == 0))
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
        unitOnTile = planet.unitTileCheck(unit.nextTile);
        if (unitOnTile == null || unitOnTile.ghosting)
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
