#monofuel
#12-2015

#classes for entities dealing with location, models and other details

units = []

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

  validateTile: (loc) ->

  update: (delta) ->

  destroy: () ->
    display.removeMesh(@mesh)
    units.remove(this)

class tank extends entity
  type: 'tank'
  constructor: (@location) ->
    if (!@validateTile(@location))
      return
    geometry = new THREE.BoxGeometry( 1, 1, 1 )
    material = new THREE.MeshLambertMaterial( { color: 0x006600 } )
    cube = new THREE.Mesh( geometry, material )
    super(@location,cube)
    @mesh = cube

  update: (delta) ->
    #move if moving
    #check for enemies

  validateTile: (loc) ->
    @tile = map.getTileAtLoc(loc)
    if (@tile.type == 0)
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
      if (tile.type != 0)
        console.log('invalid tile')
        return false
    return true
