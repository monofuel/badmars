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
