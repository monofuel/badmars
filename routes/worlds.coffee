mongoose = require('mongoose')
World = mongoose.model('World')
module.exports = (app) ->
  app.route('/worlds')
  .get((req,res,next) ->
    console.log(req.query)

    if (req.query.name == undefined)
      World.find((err,worlds) ->
        if (err)
          console.log(err)
          return next(err)
        worldNames = new Array()
        for world in worlds
          worldNames.push(world.name)
        console.log(worldNames)
        res.json(worldNames)
        )
      return

    World.find({name: req.query.name}, (err,world) ->
      if (err)
        console.log(err)
        return next(err)
      console.log("returning world " + req.query.name)
      res.json(world)
      return
      )
    )
