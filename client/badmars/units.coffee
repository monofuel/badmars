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

unitTileCheck = (tile) ->
  for unit in units
    if (unit.type == 'tank')
      if tile.equals(unit.tile)
        return true
    #if (unit.type == 'storage')
      #TODO fancy thing for multi tile units
  return false

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
  constructor: (@tile,@mesh) ->
    #console.log(JSON.stringify(@tile))
    #standardize the height based on location, not mouse click location
    @location = @tile.getLoc()
    @mesh.position.copy(@location)
    display.addMesh(@mesh)
    units.push(this)
    @mesh.userData = this


  validateTile: (loc) ->


  update: (delta) ->

  showSelection: () ->
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


  destroy: () ->
    console.log('removing ', @type)
    display.removeMesh(@mesh)
    units.splice(units.indexOf(this),1)

class groundUnit extends entity
  nextMove: direction.C
  nextTile: null
  moving: false
  speed: 1
  distanceMoved: 0.0

  updatePath: (@destination) ->

    #@nextMove = direction.C

    if (@tile.equals(@destination))
      @destination = null
      @nextMove = direction.C
      @nextTile = null
      @path = null
      return

    if (!@path || !@path.end.equals(@destination))
      @path = new AStarPath(@tile,@destination)

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

    @showSelection()
    #move if moving
    #console.log(@location)

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

          @mesh.position.copy(@location)
          @moving = true
      when direction.S
        #console.log('moving south ' + deltaMove)
        if (@distanceMoved < 1)
          @location.z += deltaMove
          #@location.y += deltaHeight

          @mesh.position.copy(@location)
          @moving = true
      when direction.E
        #console.log('moving east ' + deltaMove)
        if (@distanceMoved < 1)
          @location.x += deltaMove
          #@location.y += deltaHeight

          @mesh.position.copy(@location)
          @moving = true
      when direction.W
        #console.log('moving west ' + deltaMove)
        if (@distanceMoved < 1)
          @location.x -= deltaMove
          #@location.y += deltaHeight

          @mesh.position.copy(@location)
          @moving = true
      when direction.C
        @moving = false

    if (@distanceMoved == 1)
      #snap to grid
      @location = @nextTile.getLoc()
      @location.y += 0.25
      @mesh.position.copy(@location)
      @tile = @nextTile

      #get next move for path
      @updatePath(@destination)
      @distanceMoved = 0.0

  validateTile: () ->
    if (unitTileCheck(@tile))
      console.log('tile already occupied')
      return false
    if (@tile.type == tileType.land)
      return true
    else
      console.log('invalid tile')
      return false


class tank extends groundUnit
  type: 'tank'
  speed: 1 #1 tile per second

  constructor: (@tile) ->
    if (!@validateTile())
      return
    #geometry = new THREE.BoxGeometry( 1, 1, 1 )
    material = new THREE.MeshLambertMaterial( { color: 0x006600 } )
    #tankMesh = new THREE.Mesh( geometry, material )
    tankMesh = new THREE.Mesh(meshes.tank.geometry,material)
    tankMesh.scale.set(0.3,0.3,0.3)

    super(@tile,tankMesh)


  update: (delta) ->

    super(delta)


    #TODO
    #check for enemies
    #shoot at them
    #SHOOT THEM

class builder extends groundUnit
  type: 'builder'
  speed: 1 #1 tile per second

  constructor: (@tile) ->
    if (!@validateTile())
      return
    geometry = new THREE.BoxGeometry( 1, 1, 1 )
    material = new THREE.MeshLambertMaterial( { color: 0xCC0000 } )
    builderMesh = new THREE.Mesh( geometry, material )

    super(@tile,builderMesh)


  update: (delta) ->

    super(delta)

    #TODO
    #build things

class transport extends groundUnit
  type: 'transport'
  speed: 1 #1 tile per second

  constructor: (@tile) ->
    if (!@validateTile())
      return

    geometry = new THREE.BoxGeometry( 1, 1, 1 )
    material = new THREE.MeshLambertMaterial( { color: 0xD1A185 } )
    transportMesh = new THREE.Mesh( geometry, material )

    super(@tile,transportMesh)


  update: (delta) ->

    super(delta)


    #TODO
    #carry cargo

class storage extends entity
  type: 'storage'
  constructor: (@tile) ->
    if (!@validateTile())
      return
    geometry = new THREE.BoxGeometry( 3, 3, 3 )
    material = new THREE.MeshLambertMaterial( { color: 0x808080 } )
    cube = new THREE.Mesh( geometry, material )
    super(@tile,cube)

  update: (delta) ->
    #move resources between nearby units

  validateTile: () ->
    loc = @tile.getLoc()
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

class iron extends entity
  type: 'iron'
  rate: 0

  constructor: (@tile) ->
    if (!@validateTile())
      return
    geometry = new THREE.BoxGeometry( 0.75, 0.75, 0.75 )
    material = new THREE.MeshLambertMaterial( { color: 0xF8F8F8 } )
    cube = new THREE.Mesh( geometry, material )
    super(@tile,cube)

    rate = 0.5 + (Math.random() * 2)

  update: (delta) ->
    @showSelection()
    #iron pull tick

  validateTile: () ->
    if (unitTileCheck(@tile))
      console.log('tile already occupied')
      return false
    if (@tile.type == tileType.land)
      return true
    else
      console.log('invalid tile')
      return false

class oil extends entity
  type: 'oil'
  rate: 0

  constructor: (@tile) ->
    if (!@validateTile())
      return
    geometry = new THREE.BoxGeometry( 0.75, 0.75, 0.75 )
    material = new THREE.MeshLambertMaterial( { color: 0x181818  } )
    cube = new THREE.Mesh( geometry, material )
    super(@tile,cube)

    rate = 1000 + (Math.random() * 200)

  update: (delta) ->
    @showSelection()
    #oil draw tick

  validateTile: () ->
    if (unitTileCheck(@tile))
      console.log('tile already occupied')
      return false
    if (@tile.type == tileType.land)
      return true
    else
      console.log('invalid tile')
      return false
