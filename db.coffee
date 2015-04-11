mongoose = require('mongoose')
Mixed = mongoose.Schema.Types.Mixed
exports.Ready = false

#------------------------------------------------------------

#object definitions
worldSchema = mongoose.Schema({
  name: String
  water: Number
  vertex_grid: Mixed
  seed: Number
})

resourceSchema = mongoose.Schema({
  type: String
  rate: Number
  location: [Number]
})

buildingSchema = mongoose.Schema({
  type: String
  rate: Number
  location: [Number]
  construct_queue: [String]
  Owner: Number
})

unitSchema = mongoose.Schema({
  type: String
  rate: Number
  constructing: String
  location: [Number]
})

World = mongoose.model('World',worldSchema)
Resource = mongoose.model('Resource',resourceSchema)
Building = mongoose.model('Building',buildingSchema)
Unit = mongoose.model('Unit',unitSchema)

userSchema = mongoose.Schema({
  name: String
  password: String
  userID: Number
})
factionSchema = mongoose.Schema({
  name: String
  users: Array
})

User = mongoose.model('User',userSchema)
Faction = mongoose.model('Faction',factionSchema)


#------------------------------------------------------------

exports.init = () ->
  mongoose.connect('mongodb://localhost/badMars')
  db = mongoose.connection
  db.on('error',console.error.bind(console,'mongo connection error: '))

  db.once('open', (callback) ->
    exports.Ready = true
  )

exports.addWorld = (world) ->
  worldDoc = new World(world)
  worldDoc.save( (err,badMars) ->
    console.error(err) if (err)
  )
