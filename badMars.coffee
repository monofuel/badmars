db = require('./db.js')
WorldGenerator = require('./worldGenerator.js')
Units = require('./units.js')
Buildings = require('./buildings.js')
Net = require('./net.js')
readline = require('readline')
rl = {}

#------------------------------------------------------------
# Settings

port = 7005

#------------------------------------------------------------
# Commands

displayHelp = () ->
  console.log('Possible commands:')
  console.log('genWorld [name] [size] \tcreate a new world with name')
  console.log('listWorlds \tlist all created worlds')
  console.log('listBuildings \tlist all available buildings')
  console.log('listUnits \tlist all available units')
  console.log('showWorld \tshow all data for a world')
  console.log('showUnit \tshow stats for a unit')
  console.log('showBuilding \tshow stats for a building')
  console.log('quit \tshut down the server')

generateWorld = (name,size) ->
  if (!name)
    console.log('Please give a name')
    return
  if (!size)
    size = 256
  console.log('generating ' + name + ' with size ' + size)
  world = WorldGenerator.generate(name,size)
  db.saveWorld(world)

listBuildings = () ->
  console.log(Buildings.list())

listWorlds = () ->
  db.listWorlds(console.log)

showWorld = (name) ->
  console.log(db.getWorld(name))

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
    when 'genWorld' then generateWorld(lineList[1],lineList[2])
    when 'listWorlds' then listWorlds()
    when 'showWorld' then showWorld(lineList[1])
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
    #TODO check if test 'badmars' exists, otherwise generate it
    #badMars = WorldGenerator.generate("badMars",256)
    #db.addWorld(badMars)
    console.log('Server Ready')

    initIO() #start IO once everything else is up
    #input prompt will be shown

    #run the main loop 20 times a second
    #setInterval(mainLoop,1000/20)

#mainLoop = () ->

#------------------------------------------------------------
# init other modules

db.init()
console.log('DB Loaded')
Net.init(port)
console.log('Networking loaded')
console.log('listening on port: ' + port)
init() #init ourselves
