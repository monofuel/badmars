#monofuel
#11-2015
'use strict'

#magic for planets.
#random noise for generation
#TODO: try out custom random number implimentations.
#planet includes code for generating the heightmap, mesh, and some helper tools

#---------------------------------------------------------------------
#Enumerators

#enum for all the different types of tiles
tileType = {
  land: 0
  cliff: 1
  water: 2
  coast: 3
}

getTypeName = (type) ->
  switch (tileType)
    when tileType.land
      return 'land'
    when tileType.cliff
      return 'cliff'
    when tileType.water
      return 'water'
    when tileType.coast
      return 'coast'
    else
      return 'unknown'

#---------------------------------------------------------------------
#Map

class PlanetLoc

  constructor: (@planet, @x, @y) ->
    if ( !@planet || !@planet.grid)
      console.log(@toString())
      console.log('invalid call to PlanetLoc')
      console.log(new Error().stack)

    @x = Math.round(@x)
    @y = Math.round(@y)
    #console.log("x: " + @x + ", y: " + @y)

    if (@x < 0)
      @x = (@planet.settings.size + @x - 1) % (@planet.settings.size - 1)
    if (@x >= @planet.settings.size - 1)
      @x = @x % (@planet.settings.size - 2)
    if (@y < 0)
      @y = (@planet.settings.size + @y - 1) % (@planet.settings.size - 1)
    if (@y >= @planet.settings.size - 1)
      @y = @y % (@planet.settings.size - 2)

    if (@x >= @planet.grid[0].length - 1 || @x < 0)
      console.log(@toString())
      console.log(new Error().stack)
    if (@y >= @planet.grid.length - 1 || @y < 0)
      console.log(@toString())
      console.log(new Error().stack)

    corners = [
      @planet.grid[@y][@x],
      @planet.grid[@y+1][@x],
      @planet.grid[@y][@x+1],
      @planet.grid[@y+1][@x+1]
    ]

    @avg = (corners[0] + corners[1] + corners[2] + corners[3]) / 4
    if (@avg < @planet.settings.waterHeight)
      @avg = @planet.settings.waterHeight

    @type = @planet.navGrid[@x][@y]

    @real_x = @x + 0.5
    @real_y = - (@y + 0.5)

  getLoc: () ->
    return new THREE.Vector3(@real_x,@avg,@real_y)

  toString: () ->
    return "x: " + @x +
           ", y: " + @y +
           ", planet: " + @planet.settings.name +
           ", type: " + getTypeName(@type)

  W: () ->
    return new PlanetLoc(@planet, @x - 1, @y)

  E: () ->
    return new PlanetLoc(@planet, @x + 1, @y)

  S: () ->
    return new PlanetLoc(@planet, @x, @y - 1)
  N: () ->
    return new PlanetLoc(@planet, @x, @y + 1)

  #Used to compare PlanetLoc by value
  equals: (otherLoc) ->
    return ( otherLoc.x == @x &&
             otherLoc.y == @y &&
             otherLoc.planet == @planet )



#class for managing the game map
class Map

  # @property [Array<Array<tileCode>>] navigational grid of tileCodes
  navGrid: null

  # @property [Array<Object3D>] list of land meshes
  landMeshes: []
  waterMeshes: []

  # @property [Array<Object3D>] list of hilighted tile objects
  hilightList: []

  # @param [2D Array] heightmap for the terrain (optional)
  # @param [JObject] object defining default settings (optional)
  constructor: (@grid,@settings) ->

    #TODO should check for missing settings individually
    #rather than all or nothing
    if (!@settings)
      @settings = @defaultSettings
    if (!@grid)
      @generateWorld()
    @generateMesh()

  #generate both the world and the mesh to display
  generate: () ->
    @generateWorld()
    @generateMesh()
    @populateResources()

  #generate only the heightmap for the world
  generateWorld: () ->
    @bigNoiseGenerator = new Noise(@settings.size - 1,@settings.bigNoise)
    @medNoiseGenerator = new Noise(@settings.size - 1,@settings.medNoise)
    @smallNoiseGenerator = new Noise(@settings.size - 1,@settings.smallNoise)

    #instantiate the grid on both axes and generate the height for each point
    @grid = []
    for x in [0..@settings.size-1]
      @grid[x] = []
      for y in [0..@settings.size-1]
        point = @bigNoiseGenerator.get(x,y) * @settings.bigNoiseScale
        point += @medNoiseGenerator.get(x,y) * @settings.medNoiseScale
        point += @smallNoiseGenerator.get(x,y) * @settings.smallNoiseScale
        @grid[x][y] = point

    console.log("Generated World Heightmap")

    #instantiate the navigational Map
    @navGrid = []
    for x in [0..@settings.size-2]
      @navGrid[x] = []
      for y in [0..@settings.size-2]
        @navGrid[x][y] = @getTileCode(x,y)

  populateResources: () ->
    console.log('popultating resources')

    for x in [0..@settings.size - 2]
      for y in [0..@settings.size - 2]
        if (Math.random() < @settings.ironChance)
          tile = new PlanetLoc(this,x,y)
          new iron(tile)



    for x in [0..@settings.size - 2]
      for y in [0..@settings.size - 2]
        if (Math.random() < @settings.oilChance)
          tile = new PlanetLoc(this,x,y)
          new oil(tile)

  #generate a 3D mesh for ThreeJS based on the heightmap
  generateMesh: () ->

    @landMeshes = []
    @waterMeshes = []

    chunkCount = (@settings.size - 2) / @settings.chunkSize
    console.log("chunks: " + chunkCount)

    for y in [0..chunkCount-1]
      for x in [0..chunkCount-1]
        @generateChunk(x,y)

  generateChunk: (chunkX,chunkY) ->

    gridGeom = new THREE.Geometry()
    waterGeom = new THREE.PlaneBufferGeometry(@settings.chunkSize,@settings.chunkSize)

    @landMaterial = new THREE.MeshLambertMaterial({color: 0x00FF00})
    #@landMaterial = new THREE.MeshLambertMaterial({color: 0xFAFAFA})
    @cliffMaterial = new THREE.MeshLambertMaterial({color: 0x993300})
    #@cliffMaterial = new THREE.MeshLambertMaterial({color: 0x8C8C8C})
    @waterMaterial = new THREE.MeshLambertMaterial({color: 0x0000FF})

    #flat shading wasn't very pretty, but might be desired based on theme
    #@landMaterial.shading = THREE.FlatShading
    #@cliffMaterial.shading = THREE.FlatShading
    #@waterMaterial.shading = THREE.FlatShading


    for y in [0..@settings.chunkSize]
      for x in [0..@settings.chunkSize]
        gridGeom.vertices.push(new THREE.Vector3(x,y,@grid[(chunkY * @settings.chunkSize) + y][(chunkX * @settings.chunkSize) + x]))

    for y in [0..@settings.chunkSize - 1]
      for x in [0..@settings.chunkSize - 1]
        landFace1 = new THREE.Face3(
            y*(@settings.chunkSize + 1) + x,
            y*(@settings.chunkSize + 1) + 1 + x,
            (y+1)*(@settings.chunkSize + 1) + x)
        landFace1.materialIndex = 0;
        landFace2 = new THREE.Face3(
            y*(@settings.chunkSize + 1) + x + 1,
            (y+1)*(@settings.chunkSize + 1) + x + 1,
            (y+1)*(@settings.chunkSize + 1) + x)

        if (@navGrid[(chunkX * @settings.chunkSize) + x][(chunkY * @settings.chunkSize) + y] != 1)
          landFace1.materialIndex = 0;
          landFace2.materialIndex = 0;
        else
          landFace1.materialIndex = 1;
          landFace2.materialIndex = 1;

        gridGeom.faces.push(landFace1)
        gridGeom.faces.push(landFace2)

    gridGeom.computeBoundingSphere()
    gridGeom.computeFaceNormals()
    gridGeom.computeVertexNormals()
    waterGeom.computeBoundingSphere()
    waterGeom.computeFaceNormals()
    waterGeom.computeVertexNormals()

    planetMaterials = new THREE.MeshFaceMaterial([@landMaterial,@cliffMaterial])

    gridMesh = new THREE.Mesh(gridGeom,planetMaterials)
    waterMesh = new THREE.Mesh(waterGeom,@waterMaterial)

    gridMesh.rotation.x = - Math.PI / 2
    waterMesh.rotation.x = - Math.PI / 2

    centerMatrix =new THREE.Matrix4().makeTranslation( chunkX * @settings.chunkSize, chunkY * @settings.chunkSize, 0 )
    gridMesh.geometry.applyMatrix(centerMatrix)
    waterMesh.geometry.applyMatrix(centerMatrix)

    waterMesh.position.x += @settings.chunkSize/2
    waterMesh.position.y += @settings.waterHeight
    waterMesh.position.z -= @settings.chunkSize/2

    @landMeshes.push(gridMesh)
    @waterMeshes.push(waterMesh)

    console.log("Generated Geometry")

  # @property [JObject] default settings to use if none are specified
  #size should be a multiple of chunkSize + 2
  defaultSettings: {
    name: "unnamed",
    size: 130,
    chunkSize: 16,
    water: true,
    waterHeight: 6.4,
    bigNoise: .07,
    medNoise: .24,
    smallNoise: .53,
    bigNoiseScale: 1.8,
    medNoiseScale: 0.25,
    smallNoiseScale: 0.25,
    cliffDelta: 0.3,
    ironChance: 0.003,
    oilChance: 0.002
  }

  #3D stuff

  #gets where the mouse is clicking on the map as a Vec3
  getRayPosition: (mouse) ->
    raycaster = new THREE.Raycaster()

    raycaster.setFromCamera( mouse, display.camera )

    AllPlanetMeshes = @landMeshes.concat(@waterMeshes)
    intersects = raycaster.intersectObjects( AllPlanetMeshes )
    if ( intersects.length > 0 )
        #intersects[0].point
        #sphere = new THREE.SphereGeometry(0.25)
        #material = new THREE.MeshBasicMaterial( { color: 0xFFFFFF} );
        #sphereMesh = new THREE.Mesh( sphere, material )

        vec = intersects[0].point
        vec.x = Math.floor(vec.x) + 0.5
        vec.z = Math.floor(vec.z) + 0.5
        vec.y = vec.y + 0.5
        return vec
    else
      #console.log('did not click on map')
      return new THREE.Vector3(0,0,0)

  #rotate the map in 3D space
  # @param [Number] angle to rotate to
  rotate: (angle) ->
    axis = new THREE.Vector3(0,0,1)
    for mesh in @landMeshes.concat(@waterMeshes)
      mesh.rotateOnAxis(axis, angle)

  #remove the map fron the 3D world
  removeFromRender: () ->
    for mesh in @landMeshes.concat(@waterMeshes)
      display.removeMesh(mesh)
    console.log('removed map from scene')

  #add the map fron the 3D world
  addToRender: () ->
    for mesh in @landMeshes.concat(@waterMeshes)
      display.addMesh(mesh)
    console.log('added map to scene')


  #Hilights a tile on the map
  hilight: (color,x,y) ->
    #TODO should change order of arguments and make color optional with a default color
    newHilightLoc = [x,y]
    if (newHilightLoc == @hilightLoc)
      return

    #console.log('x: ' + x + ", y: " + y)

    @hilightLoc = newHilightLoc

    geometry = new THREE.Geometry()

    corners = [
      @grid[y][x],
      @grid[y+1][x],
      @grid[y][x+1],
      @grid[y+1][x+1]
    ]
    avg = (corners[0] + corners[1] + corners[2] + corners[3]) / 4

    geometry.vertices.push(new THREE.Vector3(0,0,corners[0]))
    geometry.vertices.push(new THREE.Vector3(1,0,corners[2]))
    geometry.vertices.push(new THREE.Vector3(0,1,corners[1]))
    geometry.vertices.push(new THREE.Vector3(1,1,corners[3]))

    geometry.faces.push(new THREE.Face3(0,1,2))
    geometry.faces.push(new THREE.Face3(1,2,3))


    geometry.computeBoundingSphere()
    geometry.computeFaceNormals()
    geometry.computeVertexNormals()

    material = new THREE.MeshBasicMaterial({color: color, side: THREE.DoubleSide})
    if (@hilightPlane)
      display.removeMesh(@hilightPlane)
    @hilightPlane = new THREE.Mesh(geometry,material)
    @hilightPlane.position.x = x
    @hilightPlane.position.z = - y
    @hilightPlane.position.y = 0.2
    @hilightPlane.rotation.x = - Math.PI / 2
    display.addMesh(@hilightPlane)

  #remove last hilighted location
  clearHilight: () ->
    if (@hilight)
      display.removeMesh(@hilightPlane)
      @hilightPlane = null
      @hilightLoc = null

  #function for updating the map each frame (unused)
  update: (delta) ->
    #TODO
    #look at where all the units are, and make sure their tiles are
    #marked as 'occupied' on the navigational Mesh
    #also make sure that unoccupied tiles are not marked occupied

  #---------------------------------------------------------------------
  #tile stuff

  #get PlanetLoc Location from vector3 in 3D space
  # @param [Vec3] location in 3D space
  # @return [PlanetLoc] info for tile
  getLoc: (vec) ->
    x = Math.floor(vec.x)
    #y is flip-flopped
    #number of tiles is size - 2
    y = - Math.ceil(vec.z)
    return new PlanetLoc(this,x,y)


  #get the tile code for a specific tiles
  #used to generate the navGrid
  # @param [Number] x
  # @param [Number] y
  # @return [tileType]
  getTileCode: (x,y) ->

    corners = [
      @grid[y][x],
      @grid[y+1][x],
      @grid[y][x+1],
      @grid[y+1][x+1]
    ]

    underwater = 0
    avg = (corners[0] + corners[1] + corners[2] + corners[3]) / 4

    for i in corners
      if (Math.abs(i - avg) > @settings.cliffDelta)
        return tileType.cliff
      if (i < @settings.waterHeight)
        underwater++

    if (underwater == 4)
      return tileType.water
    else if (underwater > 0)
      return tileType.coast
    else
      return tileType.land

#---------------------------------------------------------------------
#Noise
#spherical perlin noise from http://ronvalstar.nl/creating-tileable-noise-maps/
class Noise
  # @param [Number] size of the map to generate
  # @param [Number] noise density of detail
  constructor: (@iSize,@fNoiseScale) ->
    #Math is used for RNG
    #could be replaced with something new
    @SimplexNoise = Simplex(Math)

    if (!@iSize || @iSize < 1)
      @iSize = 31
    @fRds = @iSize
    @fRdsSin = .5*@iSize/(2*Math.PI)
    if (!@fNoiseScale || @fNoiseScale < 0)
      @fNoiseScale = .3;

  # @param [Number] x
  # @param [Number] y
  # @return [Number] height at location
  get: (x,y) ->
    fNX = (x+.5)/@iSize
    fNY = (y+.5)/@iSize
    fRdx = fNX*2*Math.PI
    fRdy = fNY*Math.PI
    fYSin = Math.sin(fRdy+Math.PI)
    a = @fRdsSin*Math.sin(fRdx)*fYSin
    b = @fRdsSin*Math.cos(fRdx)*fYSin
    c = @fRdsSin*Math.cos(fRdy)
    v = @SimplexNoise.noise(
       123+a*@fNoiseScale
      ,132+b*@fNoiseScale
      ,312+c*@fNoiseScale
    )
    return v * 5
