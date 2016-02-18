#monofuel
#1-2016
'use strict';

PlanetLoc = require('./PlanetLoc')
tileType = require('./tileType')
direction = require('./direction')

#code that interfaces with the map for pathfinding and detecting
#valid placements and movement.

#---------------------------------------------------------------------
#common functions for pathfinding

#estimate the direct distance between two tiles by air
# @param [PlanetLoc] tile first tile
# @param [PlanetLoc] tile second tile
# @return [Number] distance distance between tiles
distance = (tile1,tile2) ->
  return Math.sqrt(Math.pow(tile2.x - tile1.x,2) + Math.pow(tile2.y - tile1.y,2))

#---------------------------------------------------------------------
#code for very simple direct pathfinding
class SimplePath

  # @param [PlanetLoc] tile location to start
  # @param [PlanetLoc] tile location to end
  constructor: (@start,@end) ->
    if (!@start || !@end || @start.planet != @end.planet)
      console.log('invalid start and end points')
      console.log(new Error().stack)
      console.log(@start.toString())
      console.log(@end.toString())

    @planet = @start.planet

  #fetch the next tile to visit after a given tile
  # @param [PlanetLoc] tile the current tile
  # @return [PlanetLoc] the next tile in the list
  getNext: (tile) ->

    if (tile.x < @end.x)
      nextTile = new PlanetLoc(tile.planet,tile.x+1,tile.y)

      if (nextTile.type == tileType.land)
        return direction.E

    else if (tile.x > @end.x)
      nextTile = new PlanetLoc(tile.planet,tile.x-1,tile.y)

      if (nextTile.type == tileType.land)
        return direction.W

    if (tile.y < @end.y)
      nextTile = new PlanetLoc(tile.planet,tile.x,tile.y+1)

      if (nextTile.type == tileType.land)
        return direction.N

    else if (tile.y > @end.y)
      nextTile = new PlanetLoc(tile.planet,tile.x,tile.y-1)

      if (nextTile.type == tileType.land)
        return direction.S

    #if all else fails
    return direction.C

#---------------------------------------------------------------------
#better pathfinding algorithm using A*
class AStarPath

  # @property [PlanetLoc] location to start
  # @property [PlanetLoc] location to end
  constructor: (@start,@end) ->
    if (!@start || !@end || @start.planet != @end.planet)
      console.log('invalid start and end points')
      console.log(new Error().stack)
      console.log(@start.toString())
      console.log(@end.toString())

    @planet = @start.planet


    @path = []

    #initial open set is all 4 neighboring tiles
    open = [
      new PlanetLoc(@planet,@start.x+1, @start.y)
      new PlanetLoc(@planet,@start.x-1, @start.y)
      new PlanetLoc(@planet,@start.x, @start.y-1)
      new PlanetLoc(@planet,@start.x, @start.y+1)
    ]
    closed = [@start]
    for tile in open
      tile.cost = 1 + distance(tile,@end)
      tile.realCost = 1
      tile.prev = @start

    while (open.length > 0)
      #sort open by cost
      open.sort((a,b) ->
        return a.cost - b.cost
      )
      current = open.shift()
      closed.push(current)

      if (current.equals(@end))
        #we're done, save the path
        @path.push(current)
        while (!@start.equals(current))
          current = current.prev
          @path.push(current)
        console.log("path calculated: " + @path.length)
        return

      #check if the tile is passable
      if (current.type != tileType.land)
        continue

      #check if there is already a unit on the tile
      if (@planet.unitTileCheck(current))
        continue

      neighbors = [
        current.N()
        current.S()
        current.E()
        current.W()
      ]

      for tile in neighbors
        if (@contains(closed,tile))
          continue
        tile.cost = current.realCost + distance(tile,@end)
        tile.realCost = current.realCost + 1
        tile.prev = current
        if (!@contains(open,tile))
          open.push(tile)

  #TODO should get as close as possible
  console.log('no path found')

  contains: (list,tile) ->
    for item in list
      if item.equals(tile)
        return true
    return false

  #fetch the next tile to visit after a given tile
  # @param [PlanetLoc] tile the current tile
  # @return [PlanetLoc] the next tile in the list
  getNext: (tile) ->
    nextTile = null
    for i in [@path.length-1..1]
      if (tile.equals(@path[i]))
        nextTile = @path[i-1]
        break;

    if (nextTile == null)
      return direction.C

    if (tile.E().equals(nextTile))
      return direction.E
    if (tile.W().equals(nextTile))
      return direction.W
    if (tile.N().equals(nextTile))
      return direction.N
    if (tile.S().equals(nextTile))
      return direction.S

    #if all else fails
    return direction.C

exports.SimplePath = SimplePath
exports.AStarPath = AStarPath
