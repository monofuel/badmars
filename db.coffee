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

ResourceSchema = mongoose.Schema({
  type: String
  rate: Number
  location: Array
})

BuildingSchema = mongoose.Schema({
  type: String
  rate: Number
  location: Array
})

unitSchema = mongoose.Schema({
  type: String
  rate: Number
  location: Array
})

World = mongoose.model('World',worldSchema)
Resource = mongoose.model('World',resourceSchema)
Building = mongoose.model('World',buildingSchema)
Unit = mongoose.model('World',unitSchema)

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
  )
