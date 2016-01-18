mongoose = require('mongoose')
World = mongoose.model('World')
users = require('../util/users')

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

    World.findOne({name: req.query.name}, (err,world) ->
      if (err)
        console.log(err)
        return next(err)
      res.json(world)
      return
      )
    )
  .post(users.isLoggedIn, (req,res,next) ->
    if (!req.user.admin)
      res.send(403)
      return
    newWorld = new World(req.body)

    newWorld.save((err) ->
      if (err)
        console.log(err)
        return next(err)
      else
        console.log('saved world: ',newWorld.name);
        res.send(200);
    )
  )
  .delete(users.isLoggedIn, (req,res,next) ->
    if (!req.user.admin)
      res.send(403)
      return

    World.remove({name: req.query.name}, (err,world) ->
      if (err)
        console.log(err)
        return next(err)
      else
        res.send(200)
        return
    )
  )
