express = require('express')
router = express.Router()
exec = require('child_process').exec;
Logger = require('../util/logger')

mongoose = require('mongoose')

module.exports = (app) ->
	app.post('/management/pull', (req, res) ->
		Logger.serverInfo('update_hook',{requestIp: req.ip})
		exec('sh update.sh', (err,stdout,stderr) ->
			if (err)
				Logger.error('update_hook_error',err);

		)
		res.json(JSON.stringify({success: true}))
	)
