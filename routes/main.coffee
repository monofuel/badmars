express = require('express')
router = express.Router()

mongoose = require('mongoose')
World = mongoose.model('World')

module.exports = (app) ->
  app.get('/', (req, res) ->
    World.find( (err,worlds) ->
      worldNames = new Array()
      for world in worlds
        worldNames.push(world.name)
      res.render('pages/index', {worlds: worldNames})
    )
  )

  app.get('/planet_viewer', (req,res) ->
    res.render('pages/planet_viewer')

  )
