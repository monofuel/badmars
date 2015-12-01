#monofuel
#11-2015

#magic for planets.
#random noise for generation
#TODO: try out custom random number implimentations.
#planet includes code for generating the heightmap, mesh, and some helper tools

#---------------------------------------------------------------------
#Noise
#spherical perlin noise from http://ronvalstar.nl/creating-tileable-noise-maps/
class Noise
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

#---------------------------------------------------------------------
#Map

class Map
  #@param [2D Array] heightmap for the terrain (optional)
  #@param [jobject] object defining default settings (optional)
  constructor: (@grid,@settings) ->
    #TODO should check for missing settings individually
    if (!@settings)
      @settings = @defaultSettings
    if (!@grid)
      @generateWorld()
    @generateMesh()

  generate: () ->
    @generateWorld()
    @generateMesh()

  generateWorld: () ->
    @bigNoiseGenerator = new Noise(@settings.size - 1,@settings.bigNoise)
    @medNoiseGenerator = new Noise(@settings.size - 1,@settings.medNoise)
    @smallNoiseGenerator = new Noise(@settings.size - 1,@settings.smallNoise)

    @grid = []
    for x in [0..@settings.size-1]
      @grid[x] = []
      for y in [0..@settings.size-1]
        point = @bigNoiseGenerator.get(x,y) * @settings.bigNoiseScale
        point += @medNoiseGenerator.get(x,y) * @settings.medNoiseScale
        point += @smallNoiseGenerator.get(x,y) * @settings.smallNoiseScale
        @grid[x][y] = point


    console.log("Generated World Heightmap")


    @navGrid = []
    for x in [0..@settings.size-2]
      @navGrid[x] = []
      for y in [0..@settings.size-2]
        @navGrid[x][y] = @getTileCode(x,y)


  generateMesh: () ->

    @gridGeom = new THREE.Geometry()
    @waterGeom = new THREE.Geometry()

    @landMaterial = new THREE.MeshLambertMaterial( { wireframe: false, color: 0x00FF00})
    @cliffMaterial = new THREE.MeshLambertMaterial( { wireframe: false, color: 0xA52A2A})
    @waterMaterial = new THREE.MeshLambertMaterial( { wireframe: false, color: 0x0000FF})

    #@landMaterial.shading = THREE.FlatShading
    #@cliffMaterial.shading = THREE.FlatShading
    #@waterMaterial.shading = THREE.FlatShading

    for y in [0..@settings.size-1]
      for x in [0..@settings.size-1]
        @gridGeom.vertices.push(new THREE.Vector3(x,y,@grid[y][x]))
        @waterGeom.vertices.push(new THREE.Vector3(x,y,@settings.waterHeight))

    for y in [0..@settings.size-2]
      for x in [0..@settings.size-2]
        landFace1 = new THREE.Face3(
            y*@settings.size + x,
            y*@settings.size + x + 1,
            (y+1)*@settings.size + x)
        landFace1.materialIndex = 0;
        landFace2 = new THREE.Face3(
            y*@settings.size + x + 1,
            (y+1)*@settings.size + x + 1,
            (y+1)*@settings.size + x)

        if (@navGrid[x][y] != 1)
          landFace1.materialIndex = 0;
          landFace2.materialIndex = 0;
        else
          landFace1.materialIndex = 1;
          landFace2.materialIndex = 1;

        @gridGeom.faces.push(landFace1)
        @gridGeom.faces.push(landFace2)

        @waterGeom.faces.push(new THREE.Face3(
            y*@settings.size + x,
            y*@settings.size + x + 1,
            (y+1)*@settings.size + x))
        @waterGeom.faces.push(new THREE.Face3(
            y*@settings.size + x + 1,
            (y+1)*@settings.size + x + 1,
            (y+1)*@settings.size + x))

    @gridGeom.computeBoundingSphere()
    @gridGeom.computeFaceNormals()
    @gridGeom.computeVertexNormals()
    @waterGeom.computeBoundingSphere()
    @waterGeom.computeFaceNormals()
    @waterGeom.computeVertexNormals()

    planetMaterials = new THREE.MeshFaceMaterial([@landMaterial,@cliffMaterial])

    @gridMesh = new THREE.Mesh(@gridGeom,planetMaterials)
    @waterMesh = new THREE.Mesh(@waterGeom,@waterMaterial)

    @gridMesh.rotation.x = - Math.PI / 2
    @waterMesh.rotation.x = - Math.PI / 2

    centerMatrix =new THREE.Matrix4().makeTranslation( -@settings.size/2, -@settings.size/2, 0 )
    @gridMesh.geometry.applyMatrix(centerMatrix)
    @waterMesh.geometry.applyMatrix(centerMatrix)

    console.log("Generated Geometry")

  defaultSettings: {
    size: 64,
    water: true,
    waterHeight: 3.3,
    bigNoise: .11,
    medNoise: .24,
    smallNoise: .53,
    bigNoiseScale: 1.0,
    medNoiseScale: 0.25,
    smallNoiseScale: 0.25,
    cliffDelta: 0.3
  }

  #3D stuff
  getRayPosition: (mouse) ->
    raycaster = new THREE.Raycaster()

    raycaster.setFromCamera( mouse, display.camera )

    intersects = raycaster.intersectObjects( [map.gridMesh,map.waterMesh] )
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
      return new THREE.Vector3(0,0,0)

  rotate: (angle) ->
    axis = new THREE.Vector3(0,0,1)
    @gridMesh.rotateOnAxis(axis, angle)
    @waterMesh.rotateOnAxis(axis, angle)

  removeFromRender: () ->
    display.removeMesh(@gridMesh)
    if (@waterMesh)
      display.removeMesh(@waterMesh)

  addToRender: () ->
    display.addMesh(@gridMesh)
    if (@settings.water)
      display.addMesh(@waterMesh)
    #display.lookAt(@gridMesh)
    console.log('added map to scene')

  getTileCoords: (vec) ->
    tile = [0,0]
    #Math.floor(x)
    #Math.floor(y)
    mid = map.settings.size / 2
    tile[0] = Math.floor(vec.x) + mid
    tile[1] = Math.floor(vec.z) + mid

    return tile

  getTileCode: (x,y) ->
    #0 is navigatable land
    #1 is cliff
    #2 is water
    #3 is coastline

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
        return 1
      if (i < @settings.waterHeight)
        underwater++

    if (underwater == 4)
      return 2
    else if (underwater > 0)
      return 3
    else
      return 0


  isTilePassable: (corner1,corner2,corner3,corner4) ->

    avg = (corner1 + corner2 + corner3 + corner4) / 4

    #i'm sure this could be replaced by a much more clever one-liner
    #but this is reasonably readable.
    if (Math.abs(corner1 - avg) > @settings.cliffDelta)
      return false;
    if (Math.abs(corner2 - avg) > @settings.cliffDelta)
      return false;
    if (Math.abs(corner3 - avg) > @settings.cliffDelta)
      return false;
    if (Math.abs(corner4 - avg) > @settings.cliffDelta)
      return false;

    return true;
