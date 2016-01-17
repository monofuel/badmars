#monofuel
#11-2015
'use strict'

#TODO: coding jam idea thing
#separate pathfinding and world generation onto separate workers
#get other people to do them

#core javascript for the custom planet generator page.
#html logic (window events and m/k input)
#core game logic
#main loop

#Goals:
#modular system of generators that can be tweaked, mixed and scaled
#ability to see updates on the fly
#use datgui for watching changes
#heightmap import/export

#---------------------------------------------------------------------
#enumerators

bMode = {
  selection: 0
  move: 1
  storage: 2
  tank: 3
  builder: 4
}

#---------------------------------------------------------------------
#globals

display = null
map = null
datgui = null
delta = 0
clock = null
statsMonitor = null
buttonMode = bMode.selection
keysDown = []
selectedUnit = null

#---------------------------------------------------------------------
#tweakables

cameraSpeed = 30

#---------------------------------------------------------------------
#html5
window.onresize = () ->
  if (display)
    display.resize()

window.onload = () ->
  display = new Display()
  map = new Map()
  map.populateResources()
  map.addToRender()
  datgui = new Datgui()
  statsMonitor = new StatMonitor()
  clock = new THREE.Clock()

  requestAnimationFrame(logicLoop)

  getWorldList()

  document.body.onkeydown = (key) ->
    if (keysDown.indexOf(key.keyCode) == -1 && key.keyCode != 18) #ignore alt, because alt-tab is buggy
      keysDown.push(key.keyCode)
      #console.log('key pressed: ' + key.keyCode)

  document.body.onkeyup = (key) ->
    index = keysDown.indexOf(key.keyCode)
    if (index != -1)
      keysDown.splice(index,1)
      #console.log('key released: ' + key.keyCode)


  #block context menu for right click
  document.body.oncontextmenu = () ->
    return false

    #method to get the 3D mouse position over the terrain
    #TODO: should have a similar method to get the current tile
    # @param [onmousemove event] event
    # @returns [Vec3] position on map that is clicked
  get3DMousePos = (mouseEvent) ->
    mouse = new THREE.Vector2()
    mouse.x = ( mouseEvent.clientX / display.renderer.domElement.clientWidth ) * 2 - 1
    mouse.y = - ( mouseEvent.clientY / display.renderer.domElement.clientHeight ) * 2 + 1
    return map.getRayPosition(mouse)

  document.body.onmousemove = (event) ->

    switch (buttonMode)
      when bMode.storage #storage
        pos = get3DMousePos(event)
        tiles = []
        for j in [0..2]
          for k in [0..2]

            vec = new THREE.Vector3()
            vec.copy(pos)
            vec.x += j - 1
            vec.z += k - 1
            tile = map.getLoc(vec)
            tiles.push(tile)

        valid = true
        for tile in tiles
          if (tile.type != tileType.land)
            valid = false
        @tile = map.getLoc(pos)
        if (valid)
          map.hilight(0x7FFF00,@tile.x,@tile.y)
        else
          map.hilight(0xDC143C,@tile.x,@tile.y)

      when bMode.builder
        pos = get3DMousePos(event)
        @tile = map.getLoc(pos)
        if (@tile.type == tileType.land)
          map.hilight(0x7FFF00,@tile.x,@tile.y)
        else
          map.hilight(0xDC143C,@tile.x,@tile.y)

      when bMode.tank
        pos = get3DMousePos(event)
        @tile = map.getLoc(pos)
        if (@tile.type == tileType.land)
          map.hilight(0x7FFF00,@tile.x,@tile.y)
        else
          map.hilight(0xDC143C,@tile.x,@tile.y)

  document.body.onmousedown = (event) ->
    #TODO do something fancy to show placement

  document.body.onmouseup = (event) ->
    event.preventDefault()
    mouse = new THREE.Vector2()
    mouse.x = ( event.clientX / display.renderer.domElement.clientWidth ) * 2 - 1
    mouse.y = - ( event.clientY / display.renderer.domElement.clientHeight ) * 2 + 1
    pos = map.getRayPosition(mouse)
    @tile = map.getLoc(pos)

    switch (event.button)
      when 0
        switch(buttonMode)
          when bMode.selection #selection
            console.log('button selection')
            unit = getSelectedUnit(mouse)

            if (unit)
              console.log(unit.type + " clicked")
              @tile = map.getLoc(pos)
              selectedUnit = unit
              buttonMode = bMode.move

          when bMode.move
            unit = getSelectedUnit(mouse)

            if (unit)
              console.log(unit.type + " clicked")
              @tile = map.getLoc(pos)
              selectedUnit = unit
              buttonMode = bMode.move
            else
              buttonMode = bMode.selection
              clearButtons()
              selectedUnit = null
              map.clearHilight()

          when bMode.storage
            console.log('storage placement')
            buttonMode = bMode.selection
            clearButtons()
            new storage(@tile)
            map.clearHilight()

          when bMode.builder
            console.log('builder placement')
            buttonMode = bMode.selection
            clearButtons()
            new builder(@tile)
            map.clearHilight()

          when bMode.tank
            console.log('tank placement')
            buttonMode = bMode.selection
            clearButtons()
            new tank(@tile)
            map.clearHilight()
      when 1
        console.log('middle click')
      when 2
        switch(buttonMode)
          when bMode.move
            console.log('move ordered')
            selectedUnit.updatePath(@tile)

          else
            buttonMode = bMode.selection
            clearButtons()
            selectedUnit = null
            map.clearHilight()

storageClick = () ->
  buttonMode = bMode.storage
  button = document.getElementById('storageButton')
  clearButtons()
  button.className = "btn btn-warning"

tankClick = () ->
  buttonMode = bMode.tank
  button = document.getElementById('tankButton')
  clearButtons()
  button.className = "btn btn-warning"

builderClick = () ->
  buttonMode = bMode.builder
  button = document.getElementById('builderButton')
  clearButtons()
  button.className = "btn btn-warning"

clearButtons = () ->
  button = document.getElementById('storageButton')
  button.className = "btn btn-primary"
  button = document.getElementById('tankButton')
  button.className = "btn btn-primary"

saveWorld = () ->
  #worldSchema = mongoose.Schema({
  #  name: String
  #  water: Number
  #  vertex_grid: Mixed
  #  movement_grid: Mixed
  #  settings: Mixed
  #  seed: Number
  #})

  newWorld = {
    name: document.getElementById('worldName')
  }

  xhttp = new XMLHttpRequest();

  xhttp.open('POST','worlds',false);
  xhttp.setRequestHeader('Content-Type','application/json')
  xhttp.send(JSON.stringify(newWorld));
  if (xhttp.status == 200)
    alert('world saved!')
    getWorldList()
  else
    alert('failed to save world')

newWorld = () ->
  updateMap()

selectWorld = (world) ->
  console.log('selecting world ' + world)

  xhttp = new XMLHttpRequest()
  xhttp.open("GET", "worlds?name=" + world, true)

  xhttp.onreadystatechange = () ->
    if (xhttp.readyState == 4 && xhttp.status == 200)
      console.log('recieved world: ' + world )
      response = JSON.parse(xhttp.responseText)
      settings = {
        name: response.name
        size: response.vertex_grid.length,
        water: true,
        waterHeight: response.water
      }
      document.getElementById('worldName').innerHTML = settings.name
      map.removeFromRender()
      for unit in units
        unit.destroy()
      map = new Map(response.vertex_grid,settings)
      map.addToRender()


  xhttp.send()

getWorldList = () ->
  #https://japura.net/badmars/worlds
  xhttp = new XMLHttpRequest()
  xhttp.open("GET", "worlds", true)

  xhttp.onreadystatechange = () ->
    if (xhttp.readyState == 4 && xhttp.status == 200)
      response = JSON.parse(xhttp.responseText)
      menu = document.getElementById("worldMenu")
      menu.innerHTML = ""
      for world in response.worlds
        menu.innerHTML += '<li><a onclick="selectWorld(\'' + world + '\')" >' + world + '</a></li>'

  xhttp.send()


logicLoop = () ->
  requestAnimationFrame(logicLoop)

  statsMonitor.begin()

  delta = clock.getDelta()
  if (keysDown.length > 0)
    handleInput(delta)
  #map.rotate(Math.PI * delta / 15)

  for unit in units
    unit.update(delta)
  map.update(delta)

  display.render(delta)
  statsMonitor.end()


handleInput = (delta) ->
  #TODO
  #hilight tile should update when panning the camera
  #this would require knowing the mouse position and updating hilight position
  for key in keysDown
    switch (key)
      when 87 #w
        display.camera.translateZ(Math.cos(display.camera.rotation.x + Math.PI) * cameraSpeed * delta)
        display.camera.translateY(Math.sin(display.camera.rotation.x + Math.PI) * cameraSpeed * delta)
      when 65 #a
        display.camera.translateX(Math.cos(display.camera.rotation.x + Math.PI) * cameraSpeed * delta)
      when 83 #s
        display.camera.translateZ(Math.cos(display.camera.rotation.x) * cameraSpeed * delta)
        display.camera.translateY(Math.sin(display.camera.rotation.x) * cameraSpeed * delta)
      when 68 #d
        display.camera.translateX(Math.cos(display.camera.rotation.x) * cameraSpeed * delta)
      when 82 #r
        display.cameraUp(delta)
      when 70 #f
        display.cameraDown(delta)
      when 81 #q
        display.cameraRotateRight(delta)
      when 69 #e
        display.cameraRotateLeft(delta)

#---------------------------------------------------------------------
#Stats
class StatMonitor
  constructor: () ->
    @fpsStats = new Stats()
    @msStats = new Stats()
    @mbStats = new Stats()

    @fpsStats.setMode( 0 ); #fps
    @msStats.setMode( 1 ); #ms
    @mbStats.setMode( 2 ); #mb

    @fpsStats.domElement.style.position = 'absolute';
    @fpsStats.domElement.style.left = '0px';
    @fpsStats.domElement.style.bottom = '0px';

    @msStats.domElement.style.position = 'absolute';
    @msStats.domElement.style.left = '80px';
    @msStats.domElement.style.bottom = '0px';

    @mbStats.domElement.style.position = 'absolute';
    @mbStats.domElement.style.left = '160px';
    @mbStats.domElement.style.bottom = '0px';

    document.body.appendChild( @fpsStats.domElement );
    document.body.appendChild( @msStats.domElement );
    document.body.appendChild( @mbStats.domElement );

    console.log('stats monitor loaded')

  begin: () ->
    @fpsStats.begin()
    @msStats.begin()
    @mbStats.begin()

  end: () ->
    @fpsStats.end()
    @msStats.end()
    @mbStats.end()


#---------------------------------------------------------------------
#datgui
class Datgui
  constructor: () ->
    @gui = new dat.GUI({
      height: 5 * 32 - 1
    })

    @gui.add(map.settings, 'waterHeight')
    .min(0)
    .max(20)
    .onFinishChange( () ->
      console.log('water is now at ' + map.settings.waterHeight)
      updateMap()
      )


    @gui.add(map.settings, 'water')
    .onFinishChange( () ->
      if (map.settings.water)
        console.log('water is now on')
      else
        console.log('water is now off')
      updateMap()
      )


    @gui.add(map.settings, 'size')
    .min(34)
    .max(1026)
    .step(16)
    .onFinishChange( () ->
      console.log('map resized to ' + map.settings.size)
      updateMap()
      )

    @gui.add(map.settings, 'cliffDelta')
    .min(0)
    .max(5)
    .onFinishChange(updateMap)

    @gui.add(map.settings, 'bigNoise')
    .min(0)
    .max(1)
    .onFinishChange(updateMap)
    @gui.add(map.settings, 'bigNoiseScale')
    .min(0)
    .max(5)
    .onFinishChange(updateMap)
    @gui.add(map.settings, 'medNoise')
    .min(0)
    .max(1)
    .onFinishChange(updateMap)
    @gui.add(map.settings, 'medNoiseScale')
    .min(0)
    .max(1)
    .onFinishChange(updateMap)
    @gui.add(map.settings, 'smallNoise')
    .min(0)
    .max(1)
    .onFinishChange(updateMap)
    @gui.add(map.settings, 'smallNoiseScale')
    .min(0)
    .max(.75)
    .onFinishChange(updateMap)

updateMap = () ->
  map.removeFromRender()
  for unit in units
    if (unit)
      unit.destroy()
  map.generate()
  map.addToRender()
