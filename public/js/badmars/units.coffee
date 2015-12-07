#monofuel
#12-2015

#classes for entities dealing with location, models and other details

units = []
direction = {
  N: 0 #negative Y direction
  S: 1 #positive Y direction
  E: 2 #negative X direction
  W: 3 #positive X direction
  C: 4 #don't move
}

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

class entity
  type: 'entity'
  constructor: (@location,@mesh) ->
    @tile = map.getTileAtLoc(@location)
    console.log(JSON.stringify(@tile))
    #standardize the height based on location, not mouse click location
    @location.y = @tile.avg + 0.25
    @mesh.position.copy(@location)
    display.addMesh(@mesh)
    units.push(this)
    @mesh.userData = this

  updateLocation: (@location) ->
    @tile = map.getTileAtLoc(@location)
    @location.y = @tile.avg + 0.25
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
    @tile = map.getTileAtLoc(@location)
    if (!@validateTile())
      return
    geometry = new THREE.BoxGeometry( 1, 1, 1 )
    material = new THREE.MeshLambertMaterial( { color: 0x006600 } )
    cube = new THREE.Mesh( geometry, material )
    super(@location,cube)
    @mesh = cube

  move: (@destination) ->
    console.log(@tile)
    console.log(@destination)

    @nextMove = direction.C

    if (@tile.loc == @destination.loc)
      @destination = null
      @nextTile = null
      return

    if (@tile.loc[0] < @destination.loc[0])
      @nextMove = direction.E
      @nextTile = @tile.loc.slice(0)
      @nextTile[0]++
    else if (@tile.loc[0] > @destination.loc[0])
      @nextMove = direction.W
      @nextTile = @tile.loc.slice(0)
      @nextTile[0]--
    if (@tile.loc[1] < @destination.loc[1])
      @nextMove = direction.N
      @nextTile = @tile.loc.slice(0)
      @nextTile[1]++
    else if ((@tile.loc[1] > @destination.loc[1]))
      @nextMove = direction.S
      @nextTile = @tile.loc.slice(0)
      @nextTile[1]--

  update: (delta) ->
    #check if we are the selected unit
    if (selectedUnit == this && !@selectionCircle)
      geometry = new THREE.CircleGeometry( 1.1,12)
      material = new THREE.MeshBasicMaterial( { color: 0x66FF00, wireframe: true } )
      @selectionCircle = new THREE.Mesh( geometry, material )
      @selectionCircle.rotation.x = - Math.PI / 2
      console.log('selection Circle')
      display.addMesh(@selectionCircle)

    if (@selectionCircle && selectedUnit != this)
      display.removeMesh(@selectionCircle)
      @selectionCircle = null

    if (@selectionCircle)
      @selectionCircle.position.copy(@location)
      @selectionCircle.y += 0.2

    #move if moving
    #console.log(@location)
    @tile = map.getTileAtLoc(@location)
    #if (@nextTile != null && @tile.loc[0] == @nextTile[0] && @tile.loc[1] == @nextTile[1])
    @worldPos = map.getWorldPos(@location)

    if (@nextTile && @distanceMoved == 1)
      console.log('calculating next move')
      @move(@destination)
      @distanceMoved = 0.0

    deltaMove = @speed * delta
    if (@nextMove != direction.C)
      @distanceMoved += deltaMove
      if (@distanceMoved > 1)
        @distanceMoved = 1

    switch (@nextMove)
      when direction.N
        #console.log('moving north ' + deltaMove)
        @location.z -= deltaMove
        if (@distanceMoved == 1)
          @location.z = Math.round(@location.z*2) /2
        @updateLocation(@location)
        @moving = true
      when direction.S
        #console.log('moving south ' + deltaMove)
        @location.z += deltaMove
        if (@distanceMoved == 1)
          @location.z = Math.round(@location.z*2) /2
        @updateLocation(@location)
        @moving = true
      when direction.E
        #console.log('moving east ' + deltaMove)
        @location.x += deltaMove
        if (@distanceMoved == 1)
          @location.x = Math.round(@location.x *2) /2
        @updateLocation(@location)
        @moving = true
      when direction.W
        #console.log('moving west ' + deltaMove)
        @location.x -= deltaMove
        if (@distanceMoved == 1)
          @location.x = Math.round(@location.x *2) /2
        @updateLocation(@location)
        @moving = true
      when direction.C
        @moving = false

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
        tile = map.getTileAtLoc(vec)
        tiles.push(tile)

    for tile in tiles
      if (tile.type != tileType.land)
        console.log('invalid tile')
        return false
    return true
