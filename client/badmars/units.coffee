#monofuel
#12-2015
'use strict'

#classes for entities dealing with location, models and other details

#---------------------------------------------------------------------
#Enumerators

direction = {
  N: 0 #negative Y direction
  S: 1 #positive Y direction
  E: 2 #negative X direction
  W: 3 #positive X direction
  C: 4 #don't move
}

#---------------------------------------------------------------------
#Globals

units = []
meshes = {}

#---------------------------------------------------------------------
#helper methods

#TODO
#we should have a loading screen to halt input until after all meshes are loaded
manager = new THREE.LoadingManager()
manager.onProgress = ( item, loaded, total ) ->
  console.log( item, loaded, total )

loader = new THREE.OBJLoader( manager )
console.log('loading tank')
loader.load(
  'models/tank_mockup.obj',
  (object) ->

    tank = object
    meshes.tank = tank.children[0]
    console.log(meshes.tank)
    console.log('tank loaded')
    #scene.add(helper)
    #console.log(helper.box.min,helper.box.max)
)

getSelectedUnit = (mouse) ->
  raycaster = new THREE.Raycaster()

  raycaster.setFromCamera( mouse, display.camera )

  meshList = []
  for unit in units
    meshList.push(unit.mesh)

  intersects = raycaster.intersectObjects( meshList )
  if ( intersects.length > 0 )
      #intersects[0].point
      #sphere = new THREE.SphereGeometry(0.25)
      #material = new THREE.MeshBasicMaterial( { color: 0xFFFFFF} );
      #sphereMesh = new THREE.Mesh( sphere, material )
      return intersects[0].object.userData

  else
    console.log('no unit selected')
    return null

#---------------------------------------------------------------------
#classes

class entity
  type: 'entity'
  constructor: (@location,@mesh) ->
    @tile = map.getLoc(@location)
    #console.log(JSON.stringify(@tile))
    #standardize the height based on location, not mouse click location
    @location.y = @tile.avg + 0.25
    @mesh.position.copy(@location)
    display.addMesh(@mesh)
    units.push(this)
    @mesh.userData = this

  updateLocation: (@location) ->
    @tile = map.getLoc(@location)
    #@location.y = @tile.avg + 0.25
    @mesh.position.copy(@location)

  validateTile: (loc) ->

  update: (delta) ->

  destroy: () ->
    display.removeMesh(@mesh)
    units.remove(this)

class tank extends entity
  type: 'tank'
  nextMove: direction.C
  nextTile: null
  moving: false
  speed: 1 #1 tile per second
  distanceMoved: 0.0

  constructor: (@location) ->
    @tile = map.getLoc(@location)
    if (!@validateTile())
      return
    #geometry = new THREE.BoxGeometry( 1, 1, 1 )
    material = new THREE.MeshLambertMaterial( { color: 0x006600 } )
    #tankMesh = new THREE.Mesh( geometry, material )
    console.log(meshes)
    tankMesh = new THREE.Mesh(meshes.tank.geometry,material)
    tankMesh.scale.set(0.3,0.3,0.3)

    super(@location,tankMesh)
    @mesh = tankMesh

  updatePath: (@destination) ->

    #@nextMove = direction.C

    if (@tile.equals(@destination))
      @destination = null
      @nextMove = direction.C
      @nextTile = null
      @path = null
      return

    if (!@path || !@path.end.equals(@destination))
      @path = new SimplePath(@tile,@destination)

    @nextMove = @path.getNext(@tile)

    switch(@nextMove)
      when direction.N
        @nextTile = new PlanetLoc(@tile.planet,@tile.x,@tile.y+1)
      when direction.S
        @nextTile = new PlanetLoc(@tile.planet,@tile.x,@tile.y-1)
      when direction.E
        @nextTile = new PlanetLoc(@tile.planet,@tile.x+1,@tile.y)
      when direction.W
        @nextTile = new PlanetLoc(@tile.planet,@tile.x-1,@tile.y)
      else
        @nextTile = @tile


  update: (delta) ->
    #check if we are the selected unit
    if (selectedUnit == this && !@selectionCircle)
      geometry = new THREE.CircleGeometry( 1.1,12)
      material = new THREE.MeshBasicMaterial( { color: 0x66FF00, wireframe: true } )
      @selectionCircle = new THREE.Mesh( geometry, material )
      @selectionCircle.rotation.x = - Math.PI / 2
      display.addMesh(@selectionCircle)

    if (@selectionCircle && selectedUnit != this)
      display.removeMesh(@selectionCircle)
      @selectionCircle = null

    if (@selectionCircle)
      @selectionCircle.position.copy(@location)
      @selectionCircle.y += 0.2

    #move if moving
    #console.log(@location)
    @tile = map.getLoc(@location)

    #maybe delta move should be a vector
    deltaMove = @speed * delta
    if (@nextMove && @nextTile)
      deltaHeight = @speed * delta * (@nextTile.avg - @tile.avg)

    if (@nextMove != direction.C)
      @distanceMoved += deltaMove
      if (@distanceMoved > 1)
        @distanceMoved = 1

    switch (@nextMove)
      when direction.N
        #console.log('moving north ' + deltaMove)
        if (@distanceMoved < 1)
          @location.z -= deltaMove
          #@location.y += deltaHeight

          @updateLocation(@location)
          @moving = true
      when direction.S
        #console.log('moving south ' + deltaMove)
        if (@distanceMoved < 1)
          @location.z += deltaMove
          #@location.y += deltaHeight

          @updateLocation(@location)
          @moving = true
      when direction.E
        #console.log('moving east ' + deltaMove)
        if (@distanceMoved < 1)
          @location.x += deltaMove
          #@location.y += deltaHeight

          @updateLocation(@location)
          @moving = true
      when direction.W
        #console.log('moving west ' + deltaMove)
        if (@distanceMoved < 1)
          @location.x -= deltaMove
          #@location.y += deltaHeight

          @updateLocation(@location)
          @moving = true
      when direction.C
        @moving = false

    if (@distanceMoved == 1)
      #snap to grid
      @location.x = @nextTile.real_x + 0.5
      @location.z = @nextTile.real_y - 0.5
      @location.y = @nextTile.avg + 0.25
      @updateLocation(@location)

      #get next move for path
      @updatePath(@destination)
      @distanceMoved = 0.0

    #check for enemies

  validateTile: () ->
    if (@tile.type == tileType.land)
      return true
    else
      console.log('invalid tile')
      return false



class storage extends entity
  type: 'storage'
  constructor: (@location) ->
    if (!@validateTile(@location))
      return
    geometry = new THREE.BoxGeometry( 3, 3, 3 )
    material = new THREE.MeshLambertMaterial( { color: 0x808080 } )
    cube = new THREE.Mesh( geometry, material )
    super(@location,cube)
    @mesh = cube

  update: (delta) ->
    #move resources between nearby units

  validateTile: (loc) ->
    tiles = []
    for j in [0..2]
      for k in [0..2]
        vec = new THREE.Vector3()
        vec.copy(loc)
        vec.x += j - 1
        vec.z += k - 1
        tile = map.getLoc(vec)
        tiles.push(tile)

    for tile in tiles
      if (tile.type != tileType.land)
        console.log('invalid tile')
        return false
    return true
