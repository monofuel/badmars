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


  app.route('/spawn')
  .get((req,res,next) ->
    if (!req.isAuthenticated())
      logger.info('recieved /spawn without authentication',req);
      return res.json({error: 'please authenticate first (API keys aren\'t implimented yet)'});

    if (req.query.name == undefined)
      logger.info('recieved /spawn without world',req);
      return res.json({error: 'please specify a world. /spawn?name=world'});

    #if we got here, that means they have specified a planet name and are an authenticated user
    units.spawnPlayer(req.user._id,req.query.name)
    .then(() ->
      #TODO should send more useful information like a list of units that are being spawned and the area
      res.send({success: 'spawned successfully'});
    )
    .catch((err) ->
      logger.error(err);
      if (err.message == 'invalid planet specified')
        res.send({error: 'please specify a valid planet GET /planets for a list'});
      else
        res.send({error: 'spawning failed for unknown reason, contact admin'});
    )
  )
