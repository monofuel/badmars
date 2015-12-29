#monofuel
#11-2015
'use strict'

#code that interfaces with the map for pathfinding and detecting
#valid placements and movement.

class SimplePath

  constructor: (@start,@end) ->
    if (@start.planet != @end.planet)
      console.log('invalid start and end planets')
      console.log(new Error().stack)

    @planet = @start.planet

  getNext: () ->
