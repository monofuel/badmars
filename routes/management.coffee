express = require('express')
router = express.Router()
exec = require('child_process').exec;

mongoose = require('mongoose')

module.exports = (app) ->
	app.post('/management/pull', (req, res) ->
		console.log('recieved post to pull: ' + req.ip)
		exec('sh update.sh', (err,stdout,stderr) ->
			if (err)
				console.log('error running update script:' + err);

		)
		res.json(JSON.stringify({success: true}))
	)