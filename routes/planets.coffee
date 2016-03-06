mongoose = require('mongoose')
Planet = mongoose.model('Planet')
users = require('../util/users')
logger = require('../util/logger')
units = require('../units')

module.exports = (app) ->

  app.route('/planets')
  .get((req,res,next) ->
    console.log(req.query)

    if (req.query.name == undefined)
      Planet.find((err,planets) ->
        if (err)
          console.log(err)
          return next(err)
        planetNames = new Array()
        for planet in planets
          planetNames.push(planet.name)
        res.json({planets: planetNames})
        )
      return

    Planet.findOne({name: req.query.name}, (err,planet) ->
      if (err)
        console.log(err)
        return next(err)
      res.json(planet)
      return
      )
    )
