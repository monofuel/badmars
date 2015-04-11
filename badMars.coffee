db = require('./db.js')
WorldGenerator = require('./worldGenerator.js')
readline = require('readline')
rl = {}

#------------------------------------------------------------
# Commands

displayHelp = () ->
  console.log('Possible commands:')
  console.log('genWorld [name] [size] \tcreate a new world with name')
  console.log('quit \tshut down the server')

generateWorld = (name,size) ->
  if (!name)
    console.log('Please give a name')
    return
  if (!size)
    size = 256
  console.log('generating ' + name + ' with size ' + size)
  world = WorldGenerator.generate(name,size)
  #db.saveWorld(world)

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
    when 'exit' then shutdown()
    when 'quit' then shutdown()
    when 'q' then shutdown()

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
WorldGenerator.init()
console.log('World Generator Loaded')
init() #init ourselves
