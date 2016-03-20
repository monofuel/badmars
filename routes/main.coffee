express = require('express')
router = express.Router()

mongoose = require('mongoose')
World = mongoose.model('World')
env = process.env.NODE_ENV || 'dev';

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
		if (env == 'dev')
			console.log('dev login')
			req.user = {
				username: "monofuel",
				admin: true
			}

		res.render('pages/planet_viewer', {
			user: req.user
			})

	)

	app.get('/badMars_v1', (req,res) ->
		#serverAddress = 'ws://localhost';
		serverAddress = 'ws://104.155.146.168';
		port = '7005';
		env = process.env.NODE_ENV || 'dev';
		if (env == 'production')
			serverAddress = 'ws://104.197.118.170'
			port = '7005'

		res.render('pages/badmars_v1', {
			user: req.user,
			server: serverAddress,
			port: port
			})

	)
