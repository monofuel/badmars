db = require('./db.js')
WorldGenerator = require('./worldGenerator.js')

#------------------------------------------------------------

waitForDB = () ->
  if (!db.Ready)
    setTimeout(init,1)
    return false
  else
    return true

init = () ->
  if (waitForDB())
    #TODO check if test 'badmars' exists, otherwise generate it
    badMars = WorldGenerator.generate("badMars",256)
    db.addWorld(badMars)
    console.log('Server Ready')
    #setInterval(mainLoop,20)

#mainLoop = () ->

#------------------------------------------------------------

Ready = false

db.init()
console.log('DB Loaded')
WorldGenerator.init()
console.log('World Generator Loaded')
init()
