#monofuel
#11-2015
'use strict'

#code that interfaces with the map for pathfinding and detecting
#valid placements and movement.

class SimplePath

  constructor: (@start,@end) ->
    if (!@start || !@end || @start.planet != @end.planet)
      console.log('invalid start and end points')
      console.log(new Error().stack)
      console.log(@start)
      console.log(@end)

    @planet = @start.planet

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



class AStarPath

  constructor: (@start,@end) ->
    if (!@start || !@end || @start.planet != @end.planet)
      console.log('invalid start and end points')
      console.log(new Error().stack)
      console.log(@start)
      console.log(@end)

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
      tile.cost = 1 + @distance(tile,@end)
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
      if (unitTileCheck(current))
        continue

      neighbors = []

      if (current.x > 0)
        neighbors.push(new PlanetLoc(@planet,current.x-1, current.y))
      if (current.y > 0)
        neighbors.push(new PlanetLoc(@planet,current.x, current.y-1))
      if (current.x < @planet.settings.size - 1)
        neighbors.push(new PlanetLoc(@planet,current.x+1, current.y))
      if (current.y < @planet.settings.size - 1)
        neighbors.push(new PlanetLoc(@planet,current.x, current.y+1))

      for tile in neighbors
        if (@contains(closed,tile))
          continue
        tile.cost = current.realCost + @distance(tile,@end)
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

  distance: (tile1,tile2) ->
    return Math.sqrt(Math.pow(tile2.x - tile1.x,2) + Math.pow(tile2.y - tile1.y,2))

  getNext: (tile) ->
    nextTile = null
    for i in [@path.length-1..1]
      if (tile.equals(@path[i]))
        nextTile = @path[i-1]
        break;

    if (nextTile == null)
      return direction.C

    if (tile.x < nextTile.x)
      return direction.E
    if (tile.x > nextTile.x)
      return direction.W
    if (tile.y < nextTile.y)
      return direction.N
    if (tile.y > nextTile.y)
      return direction.S

    #if all else fails
    return direction.C
