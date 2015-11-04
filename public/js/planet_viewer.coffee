#monofuel 2015

#---------------------------------------------------------------------
#basic init magic
window.onload = () ->
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.1,1000)
  renderer = new THREE.WebGLRenderer({antialias: true})
  container = document.getElementById('threePanel');
  #renderer.setSize(container.offsetWidth, container.offsetHeight)
  renderer.setSize(500,500)
  container.appendChild(renderer.domElement)

  #---------------------------------------------------------------------
  #map world
  #tiles is a 2d array
  #each element is the height of a vertex
  #water is the height of the water map
  manualWorld = {
    water : 0.1,
    grid : [[0,1,0,0],[0,0,0.5,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]]
  }


  ###########################
  #spherical perlin noise from http://ronvalstar.nl/creating-tileable-noise-maps/
  iSize = 31
  fRds = iSize # the radius of a circle
  fRdsSin = .5*iSize/(2*Math.PI)
  fNoiseScale = .3;

  noise = (x,y) ->
    fNX = (x+.5)/iSize
    fNY = (y+.5)/iSize
    fRdx = fNX*2*Math.PI
    fRdy = fNY*Math.PI # the vertical offset of a 3D sphere spans only half a circle, so that is one Pi radians
    fYSin = Math.sin(fRdy+Math.PI) # a 3D sphere can be seen as a bunch of cicles stacked onto each other, the radius of each of these is defined by the vertical position (again one Pi radians)
    a = fRdsSin*Math.sin(fRdx)*fYSin
    b = fRdsSin*Math.cos(fRdx)*fYSin
    c = fRdsSin*Math.cos(fRdy)
    v = Simplex.noise(
       123+a*fNoiseScale
      ,132+b*fNoiseScale
      ,312+c*fNoiseScale
    )
    return v * 5
  #end perlin noise
  ##########################

  chunk_size = 32

  generatedWorld = {}

  generatedWorld.water = 2
  generatedWorld.grid = []

  for x in [0..chunk_size-1]
    generatedWorld.grid[x] = []
    for y in [0..chunk_size-1]
      generatedWorld.grid[x][y] = noise(x,y)
      #generatedWorld.grid[x][y] = Math.random() * 2

  console.log generatedWorld

  #TODO: design method to convert the grid map
  #to a tile map, which gives assigns a value of
  #water, land or cliff to each square.

  #---------------------------------------------------------------------
  #build the scene
  #geometry = new THREE.BoxGeometry(1,1,1)
  landMaterial = new THREE.MeshLambertMaterial( { wireframe: false, color: 0x00ff00})
  waterMaterial = new THREE.MeshLambertMaterial( { wireframe: false, color: 0x0000ff})
  #cube = new THREE.Mesh(geometry,material)
  #scene.add(cube)

  myWorld = generatedWorld

  grid_y = myWorld.grid.length
  grid_x = myWorld.grid[0].length #pray the map is valid
  console.log "grid size is ",grid_x,grid_y
  water_height = myWorld.water
  console.log "water height is ",water_height

  grid_geom = new THREE.Geometry()
  water_geom = new THREE.Geometry()

  for y in [0..grid_y-1]
    for x in [0..grid_x-1]
      grid_geom.vertices.push(new THREE.Vector3(x,y,myWorld.grid[y][x]))
      water_geom.vertices.push(new THREE.Vector3(x,y,water_height))

  for y in [0..grid_y-2]
    for x in [0..grid_x-2]
      grid_geom.faces.push(new THREE.Face3(
          y*grid_x + x,
          y*grid_x + x + 1,
          (y+1)*grid_x + x))
      grid_geom.faces.push(new THREE.Face3(
          y*grid_x + x + 1,
          (y+1)*grid_x + x + 1,
          (y+1)*grid_x + x))

      water_geom.faces.push(new THREE.Face3(
          y*grid_x + x,
          y*grid_x + x + 1,
          (y+1)*grid_x + x))
      water_geom.faces.push(new THREE.Face3(
          y*grid_x + x + 1,
          (y+1)*grid_x + x + 1,
          (y+1)*grid_x + x))

  grid_geom.computeBoundingSphere()
  grid_geom.computeFaceNormals()
  grid_geom.computeVertexNormals()
  water_geom.computeBoundingSphere()
  water_geom.computeFaceNormals()
  water_geom.computeVertexNormals()
  grid_mesh = new THREE.Mesh(grid_geom,landMaterial)
  water_mesh = new THREE.Mesh(water_geom,waterMaterial)

  centerMatrix =new THREE.Matrix4().makeTranslation( -grid_x/2, -grid_y/2, 0 )
  grid_mesh.geometry.applyMatrix(centerMatrix)
  water_mesh.geometry.applyMatrix(centerMatrix)

  scene.add(grid_mesh)
  scene.add(water_mesh)


  #controls and camera
  #controls = new THREE.FirstPersonControls(camera)
  #controls.movementSpeed = 1
  #controls.lookSpeed = 0.1
  clock = new THREE.Clock()
  grid_mesh.rotation.x = - Math.PI / 2
  water_mesh.rotation.x = - Math.PI / 2

  camera.position.z = 18
  camera.position.y = 7
  camera.rotation.x = - Math.PI / 8
  #controls.update(0)

  light = new THREE.AmbientLight(0x101010)
  scene.add(light)

  directionalLight = new THREE.DirectionalLight(0xffffff,0.5)
  directionalLight.position.set(0,.5,0)
  scene.add(directionalLight)



  #---------------------------------------------------------------------
  #custom loop stuff
  delta = 0
  doWork = () ->
    delta = clock.getDelta()
    axis = new THREE.Vector3(0,0,1)
    #controls.update(delta)
    #grid_mesh.rotation.z += Math.PI * delta / 5
    #water_mesh.rotation.z += Math.PI * delta / 5
    grid_mesh.rotateOnAxis(axis, Math.PI * delta / 5)
    water_mesh.rotateOnAxis(axis, Math.PI * delta / 5)

  #---------------------------------------------------------------------
  #render loop
  render = () ->
    requestAnimationFrame(render)
    doWork()
    renderer.render(scene,camera)

  render()
