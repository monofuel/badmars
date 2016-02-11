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
      res.render('pages/index', {
          worlds: worldNames,
          user: req.user
        })
    )
  )

  app.get('/planet_viewer', (req,res) ->
    res.render('pages/planet_viewer', {
      user: req.user
      })

  )

  app.get('/badMars_v1', (req,res) ->
    res.render('pages/badmars_v1', {
      user: req.user
      })

  )
