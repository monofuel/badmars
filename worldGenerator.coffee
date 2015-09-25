SimplexNoise = require('simplex-noise')
simplex = {}

#------------------------------------------------------------

#exports.init = () ->

exports.generate = (name,iSize,seed) ->
  if (!seed)
    seed = Math.random
  simplex = new SimplexNoise(seed)

  #subtract 1 from isize so that the
  #map properly loops
  iSize = iSize - 1

  fRds = iSize                    # the radius of the planet
  fRdsSin = .5*iSize/(2*Math.PI)
  fNoiseScale = .3
  chunk_size = iSize + 1          # generate the entire world at once

  noise = (x,y) ->
    fNX = (x+.5)/iSize
    fNY = (y+.5)/iSize
    fRdx = fNX*2*Math.PI
    fRdy = fNY*Math.PI # the vertical offset of a 3D sphere
                       # spans only half a circle, so that is one Pi radians
    fYSin = Math.sin(fRdy+Math.PI) # a 3D sphere can be seen as a
                                   # bunch of cicles stacked onto each other,
                                   # the radius of each of these is defined
                                   # by the vertical position
                                   # (again one Pi radians)
    a = fRdsSin*Math.sin(fRdx)*fYSin
    b = fRdsSin*Math.cos(fRdx)*fYSin
    c = fRdsSin*Math.cos(fRdy)
    v = simplex.noise3D(
      123+a*fNoiseScale,
      132+b*fNoiseScale,
      312+c*fNoiseScale
    )
    return v * 5
  #end perlin noise
  ##########################

  generatedWorld = {}

  generatedWorld.name = name
  generatedWorld.water = 2
  generatedWorld.vertex_grid = []
  generatedWorld.movement_grid = []

  for x in [0..chunk_size-1]
    generatedWorld.vertex_grid[x] = []
    for y in [0..chunk_size-1]
      generatedWorld.vertex_grid[x][y] = noise(x,y)

  return generatedWorld
