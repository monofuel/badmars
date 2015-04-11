mongoose = require('mongoose')
Mixed = mongoose.Schema.Types.Mixed
exports.Ready = false

#------------------------------------------------------------

#object definitions
worldSchema = mongoose.Schema({
  name: String
  water: Number
  vertex_grid: Mixed
})

World = mongoose.model('World',worldSchema)

#------------------------------------------------------------

exports.init = () ->
  mongoose.connect('mongodb://localhost/badMars')
  db = mongoose.connection
  db.on('error',console.error.bind(console,'mongo connection error: '))

  db.once('open', func = (callback) ->
    exports.Ready = true
  )

exports.addWorld = (world) ->
  worldDoc = new World(world)
  worldDoc.save(func = (err,badMars) ->
    console.error(err) if (err)
    console.log(badMars)
  )
