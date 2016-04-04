request = require('request')
os = require('os')

env = process.env.NODE_ENV || 'dev';

process.on('uncaughtException', (err) ->
	module.exports.error(err);
	console.log(err);
);

# @param [Object] err javascript error object
module.exports.error = (err) ->
	timestamp = new Date();
	console.log(dateFormat(timestamp) + " : " + err.stack);
	track("error", {
		message: err.message
		stack: err.stack
		})

# @param [String] info message to log
module.exports.info = (info, req) ->
	timestamp = new Date();

	track(info,{
		ip: req?.ip
		username: req?.user?.username
		})

	if (req)
		if (req.isAuthenticated && req.isAuthenticated())
			console.log("INFO: " + dateFormat(timestamp) + ": " + info + " FROM: " + req.ip + " USER: " + req.user.username);
		else
			console.log("INFO: " +dateFormat(timestamp) + ": " + info + " FROM: " + req.ip);

	else
		console.log("INFO: " +dateFormat(timestamp) + ": " + info);

module.exports.serverInfo = (info, body,silent) ->
	timestamp = new Date();
	track(info,body)
	if (silent)
		return
	if (body)
		console.log("INFO: " + dateFormat(timestamp) + ": " + info + " : " + JSON.stringify(body));
	else
		console.log("INFO: " + dateFormat(timestamp) + ": " + info);

dateFormat = (date) ->
	return date.getMonth() + "/" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes()

verifyTrack = (name,kargs) ->
	for key in Object.keys(kargs)
		if (typeof kargs[key] == 'object')
			console.log('invalid element ' + key + ' on ' + name);
			delete kargs[key];
			track('error', {
				msg: 'invalid element ' + key + ' on ' + name
				})


track = (name, kargs) ->
	if not kargs
		kargs = {}
	name = name.replace('/ /g',"_").replace('/:/g'," ");
	kargs.name = "server_" + name
	kargs.hostname = os.hostname()
	kargs.env = env
	verifyTrack(name,kargs)
	request({
		url: "http://104.197.78.205:9001/track/event",
		method: 'POST',
		body: JSON.stringify(kargs)
		}, (error, response, body) ->
			if(error)
				console.log(error);
		);
