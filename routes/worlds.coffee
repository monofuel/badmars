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
        res.json({worlds: worldNames})
        )
      return

    World.find({name: req.query.name}, (err,world) ->
      if (err)
        console.log(err)
        return next(err)
      res.json(world)
      return
      )
    )
