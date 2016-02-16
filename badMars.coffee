db = require('./db.js')
#WorldGenerator = require('./worldGenerator.js')
Units = require('./units.js')
Buildings = require('./buildings.js')
Planet = require('./planet.js')
Net = require('./net.js')
readline = require('readline')
rl = {}

#------------------------------------------------------------
# Settings

port = 7005

#------------------------------------------------------------
# Commands

#@TODO commands should probably be restructured to be more scalable and easy to work on

displayHelp = () ->
  console.log('Possible commands:')
  #console.log('genWorld [name] [size] \tcreate a new world with name')
  console.log('listWorlds \tlist all created worlds')
  console.log('removeWorld [name]\tremove a specific world')
  console.log('createPlanet [name] [world]\tcreate a new instance of a world')
  console.log('listPlanets \tlist all created planets')
  console.log('removePlanet [name]\tremove a specific planet')
  console.log('listBuildings \tlist all available buildings')
  console.log('listUnits \tlist all available units')
  console.log('showWorld \tshow all data for a world')
  console.log('showPlanet \tshow all data for a planet')
  console.log('showUnit \tshow stats for a unit')
  console.log('showBuilding \tshow stats for a building')
  console.log('quit \tshut down the server')

#TODO world generator on server is disabled
#current best world generator is in planet viewer
#should maybe re-integrate into server sometime
###generateWorld = (name,size) ->
  if (!name)
    console.log('Please give a name')
    return
  if (!size)
    size = 256
  console.log('generating ' + name + ' with size ' + size)
  world = WorldGenerator.generate(name,size)
  db.saveWorld(world)
###

createPlanet = (planetName,worldName) ->
  if (!planetName)
    console.log('Please give a name for the new planet')
    return
  if (!worldName)
    console.log('Please give a name for the world map to use')
    return
  console.log('creating new planet:',planetName,'with map',worldName);
  db.createPlanet(planetName,worldName).then(() ->
    planet = new Planet(planetName)
    planet.init()
    .then(() ->
      console.log(planet.name," loaded")
      planetList.push(planet)
    )
  )

listBuildings = () ->
  console.log(Buildings.list())

listWorlds = () ->
  db.listWorlds(console.log)

listPlanets = () ->
  db.listPlanets(console.log)

removeWorld = (name) ->
  db.removeWorld(name)

removePlanet = (name) ->
  db.removePlanet(name)

showWorld = (name) ->
  db.getWorld(name)
  .then((world) ->
    console.log(world)
  )

showPlanet = (name) ->
  db.getPlanet(name)
  .then((planet) ->
    console.log(planet);
  )

showBuilding = (name) ->
  building = Buildings.get(name)
  if (building)
    console.log(building)
  else
    if name
      console.log(name + ' does not exist')
    else
      console.log('please give a building name')

listUnits = () ->
  console.log(Units.list())

showUnit = (name) ->
  unit = Units.get(name)
  if (unit)
    console.log(unit)
  else
    if name
      console.log(name + ' does not exist')
    else
      console.log('please give a unit name')

shutdown = () ->
  console.log('Shutting down!')
  process.exit()

#------------------------------------------------------------
# Functions
#@todo start process should be refactored into a list of promises
#sorry, it was written before i knew promises were a thing
waitForDB = () ->
  if (!db.Ready)
    setTimeout(init,1)
    return false
  else
    return true

handleCommand = (line) ->
  lineList = line.split(" ")

  switch lineList[0]
    when 'help' then displayHelp()
    #when 'genWorld' then generateWorld(lineList[1],lineList[2])
    when 'listWorlds' then listWorlds()
    when 'removeWorld' then removeWorld(lineList[1]);
    when 'showWorld' then showWorld(lineList[1])
    when 'createPlanet' then createPlanet(lineList[1],lineList[2])
    when 'listPlanets' then listPlanets()
    when 'removePlanet' then removePlanet(lineList[1]);
    when 'showPlanet' then showPlanet(lineList[1]);
    when 'listBuildings' then listBuildings()
    when 'showBuilding' then showBuilding(lineList[1])
    when 'listUnits' then listUnits()
    when 'showUnit' then showUnit(lineList[1])
    when 'exit' then shutdown()
    when 'quit' then shutdown()
    when 'q' then shutdown()
    else console.log("unknown command")

  #always hand prompt back to user
  rl.prompt(true)

initIO = () ->
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
  })

  rl.setPrompt('>')
  rl.on('line', handleCommand)
  rl.prompt(true)

init = () ->
  if (waitForDB())
    #@TODO check if test 'badmars' exists, otherwise generate it
    #badMars = WorldGenerator.generate("badMars",256)
    #db.addWorld(badMars)
    console.log('Server Ready')

    initIO() #start IO once everything else is up
    #input prompt will be shown

    db.listPlanets((list) ->
      for name in list
        planet = new Planet(name)
        planet.init()
        .then((loadedPlanet) ->
          console.log(loadedPlanet.name," loaded")
          planetList.push(loadedPlanet)

          #@todo planet load happens after we say 'server ready', should be before


        )
      )


    setInterval(mainLoop,1000/20);

#@todo variables are getting messy here
planetList = []
exports.planetList = planetList
lastTick = (new Date).getTime()

mainLoop = () ->
  curTick = (new Date).getTime()
  delta = (curTick - lastTick) / 1000
  if (delta > (200 / 1000))
    delta = 200 / 1000 #maximum dleta size
  lastTick = curTick
  for planet in planetList
    planet.update(delta);
  updateEndTime = (new Date).getTime()

  ###had issues with setInterval being delayed
  nextRun = (1000/20) - (updateEndTime - curTick)
  if (nextRun < 0)
    nextRun = 0;
  console.log('scheduling next run: ',nextRun)
  #run the main loop 20 times a second
  setTimeout(mainLoop,nextRun)###

#------------------------------------------------------------
# init other modules

db.init()
console.log('DB Loaded')
Net.init(port)
console.log('Networking loaded')
console.log('listening on port: ' + port)
init() #init ourselves
