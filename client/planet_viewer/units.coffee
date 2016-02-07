#monofuel
#1-2016
'use strict';
### @flow weak ###

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

#units should probably be added to planet data
units = []
#mesh JObject is built at start when models are loaded
meshes = {}

#---------------------------------------------------------------------
#helper methods

#TODO
#we should have a loading screen to halt input until after all meshes are loaded
manager = new THREE.LoadingManager()
manager.onProgress = ( item, loaded, total ) ->
  console.log( item, loaded, total )

#TODO should iterate over a list of models to load
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

#check if a unit is blocking the tile
#@param [PlanetLoc] tile tile on the map to check for unit
#@return [Boolean] if the tile is blocked
unitTileCheck = (tile) ->
  for unit in units
    if (unit.type == 'tank')
      if tile.equals(unit.tile)
        return true
    #if (unit.type == 'storage')
      #TODO fancy thing for multi tile units
  return false

#get the unit at the mouse location
#@param [Vec2] Mouse x and y position of mouse on the screen
#@return [Unit] the unit selected
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

#superclass for all units in the game world with a location and a mesh
class entity
  #@property [String] type the type of unit
  type: 'entity'
  #@property [String] owner the owner of the unit
  owner: 'admin'
  #@property [Number] the height of the unit above the ground (to fudge model origin)
  unitHeight: 0.25

  #super method that should always be called
  #@param [PlanetLoc] tile location on the map
  #@param [Object3D] mesh for the entity
  constructor: (@tile,@mesh) ->
    #console.log(JSON.stringify(@tile))
    #standardize the height based on location, not mouse click location
    @location = @tile.getLoc()
    @mesh.position.copy(@location)
    display.addMesh(@mesh)
    units.push(this)
    @mesh.userData = this

  #@return [Boolean] is the tile for the unit valid
  validateTile: () ->
    console.log('valid tile is not implimented for unit');

  #update this entity
  #@param [Number] Time since the last frame
  update: (delta) ->
    #does nothing on default

    return

  #mark the unit as selected if it is the selected unit
  #@todo this should be different for larger units
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

  #remove this unit from the world and clean up stuff
  destroy: () ->
    console.log('removing ', @type)
    display.removeMesh(@mesh)
    units.splice(units.indexOf(this),1)

#superclass for all ground-based units
class groundUnit extends entity
  nextMove: direction.C
  nextTile: null
  moving: false
  #@property [Number] speed in tiles per second
  speed: 1
  distanceMoved: 0.0
  unitHeight: 0.25

  #update the destination for this unit
  #will update the nextMove and nextTile properties unless they are already set
  #@param [PlanetLoc] destination new destination for this unit
  updatePath: (@destination) ->

    #clear properties if our tile is the destination
    if (@tile.equals(@destination))
      @destination = null
      @nextMove = direction.C
      @nextTile = null
      @path = null
      return


    #if we have no destination, set it
    #or update it if we have a new destination
    if (!@path || !@path.end.equals(@destination))
      @path = new AStarPath(@tile,@destination)

    #dont' mess with things if we are stil moving
    if (@moving)
      return

    #calculate the next movement tile and direction

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


  #update this entity
  #@param [Number] Time since the last frame
  update: (delta) ->

    super()
    #check if we need to toggle showing us as selected
    @showSelection()


    #@todo delta should be a vector
    #tile should also not have to be a neighboring tile
    #if the next tile is multiple tiles away, we should handle that gracefully
    #and jump ahead as this means it fell behind.
    deltaMove = @speed * delta
    if (@nextTile)
      deltaHeight = @speed * delta * (@nextTile.avg - @tile.avg)
    else
      deltaHeight = 0


    if (@nextMove != direction.C)
      @distanceMoved += deltaMove
      if (@distanceMoved > 1)
        @distanceMoved = 1

    switch (@nextMove)
      when direction.N
        #console.log('moving north ' + deltaMove)
        if (@distanceMoved < 1)
          @location.z -= deltaMove
          @location.y += deltaHeight

          @mesh.position.copy(@location)
          @moving = true
      when direction.S
        #console.log('moving south ' + deltaMove)
        if (@distanceMoved < 1)
          @location.z += deltaMove
          @location.y += deltaHeight

          @mesh.position.copy(@location)
          @moving = true
      when direction.E
        #console.log('moving east ' + deltaMove)
        if (@distanceMoved < 1)
          @location.x += deltaMove
          @location.y += deltaHeight

          @mesh.position.copy(@location)
          @moving = true
      when direction.W
        #console.log('moving west ' + deltaMove)
        if (@distanceMoved < 1)
          @location.x -= deltaMove
          @location.y += deltaHeight

          @mesh.position.copy(@location)
          @moving = true
      when direction.C
        @moving = false

    if (@distanceMoved == 1)
      @moving = false
      #snap to grid
      @location = @nextTile.getLoc()
      @location.y += @unitHeight
      @mesh.position.copy(@location)
      @tile = @nextTile

      #get next move for path
      @updatePath(@destination)
      @distanceMoved = 0.0

  #@return [Boolean] is the tile for the unit valid
  validateTile: () ->
    if (unitTileCheck(@tile))
      console.log('tile already occupied')
      return false
    if (@tile.type == tileType.land)
      return true
    else
      console.log('invalid tile')
      return false

#tank unit
class tank extends groundUnit
  type: 'tank'
  speed: 1

  #@param [PlanetLoc] Location to place
  constructor: (@tile) ->
    if (!@validateTile())
      return
    #geometry = new THREE.BoxGeometry( 1, 1, 1 )
    material = new THREE.MeshLambertMaterial( { color: 0x006600 } )
    #tankMesh = new THREE.Mesh( geometry, material )
    tankMesh = new THREE.Mesh(meshes.tank.geometry,material)
    tankMesh.scale.set(0.3,0.3,0.3)

    super(@tile,tankMesh)

  #update this entity
  #@param [Number] Time since the last frame
  update: (delta) ->

    super(delta)


    #@todo
    #check for enemies
    #shoot at them
    #SHOOT THEM

#constructor unit
class builder extends groundUnit
  type: 'builder'
  speed: 1 #1 tile per second

  #@param [PlanetLoc] Location to place
  constructor: (@tile) ->
    if (!@validateTile())
      return
    geometry = new THREE.BoxGeometry( 1, 1, 1 )
    material = new THREE.MeshLambertMaterial( { color: 0xCC0000 } )
    builderMesh = new THREE.Mesh( geometry, material )

    super(@tile,builderMesh)

  #update this entity
  #@param [Number] Time since the last frame
  update: (delta) ->

    super(delta)

    #@todo
    #build things
    #idea: the player can place down 'ghost buildings' to hint where to build
    #buiders will hunt for nearby ghosts to construct that have sources nearby
    #kind of like factorio

#resource transport unit
class transport extends groundUnit
  type: 'transport'
  speed: 1 #1 tile per second

  #@param [PlanetLoc] Location to place
  constructor: (@tile) ->
    if (!@validateTile())
      return

    geometry = new THREE.BoxGeometry( 1, 1, 1 )
    material = new THREE.MeshLambertMaterial( { color: 0xD1A185 } )
    transportMesh = new THREE.Mesh( geometry, material )

    super(@tile,transportMesh)

  #update this entity
  #@param [Number] Time since the last frame
  update: (delta) ->

    super(delta)


    #@todo
    #carry cargo
    #transportation routes?
    #maybe hunt out builders that want resources?

#storage building
class storage extends entity
  type: 'storage'

  #@param [PlanetLoc] Location to place
  constructor: (@tile) ->
    if (!@validateTile())
      return
    geometry = new THREE.BoxGeometry( 3, 3, 3 )
    material = new THREE.MeshLambertMaterial( { color: 0x808080 } )
    cube = new THREE.Mesh( geometry, material )
    super(@tile,cube)

  #update this entity
  #@param [Number] Time since the last frame
  update: (delta) ->
    #move resources between nearby units

  #special tile validation for 3x3 building
  #@return [Boolean] is the tile for the unit valid
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

#iron resource
class iron extends entity
  type: 'iron'
  rate: 0

  #@param [PlanetLoc] Location to place
  constructor: (@tile) ->
    if (!@validateTile())
      return
    geometry = new THREE.BoxGeometry( 0.75, 0.75, 0.75 )
    material = new THREE.MeshLambertMaterial( { color: 0xF8F8F8 } )
    cube = new THREE.Mesh( geometry, material )
    super(@tile,cube)

    rate = 0.5 + (Math.random() * 2)

  #update this entity
  #@param [Number] Time since the last frame
  update: (delta) ->
    @showSelection()
    #iron pull tick

  #@return [Boolean] is the tile for the unit valid
  validateTile: () ->
    if (unitTileCheck(@tile))
      console.log('tile already occupied')
      return false
    if (@tile.type == tileType.land)
      return true
    else
      console.log('invalid tile')
      return false

#oil resource
class oil extends entity
  type: 'oil'
  rate: 0

  #@param [PlanetLoc] Location to place
  constructor: (@tile) ->
    if (!@validateTile())
      return
    geometry = new THREE.BoxGeometry( 0.75, 0.75, 0.75 )
    material = new THREE.MeshLambertMaterial( { color: 0x181818  } )
    cube = new THREE.Mesh( geometry, material )
    super(@tile,cube)

    rate = 1000 + (Math.random() * 200)

  #update this entity
  #@param [Number] Time since the last frame
  update: (delta) ->
    @showSelection()
    #oil draw tick

  #@return [Boolean] is the tile for the unit valid
  validateTile: () ->
    if (unitTileCheck(@tile))
      console.log('tile already occupied')
      return false
    if (@tile.type == tileType.land)
      return true
    else
      console.log('invalid tile')
      return false
