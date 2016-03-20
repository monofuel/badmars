request = require('request')
os = require('os')

process.on('uncaughtException', (err) ->
	module.exports.error(err);
	console.log(err);
);

# @param [Object] err javascript error object
module.exports.error = (err) ->
	timestamp = new Date();
	console.log(timestamp.toTimeString() + " : " + err.stack);
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
			console.log("INFO: " + timestamp.toTimeString() + " : " + info + " FROM: " + req.ip + " USER: " + req.user.username);
		else
			console.log("INFO: " + timestamp.toTimeString() + " : " + info + " FROM: " + req.ip);

	else
		console.log("INFO: " + timestamp.toTimeString() + " : " + info);

module.exports.serverInfo = (info, body) ->
	timestamp = new Date();
	track(info,body)
	console.log("INFO: " + timestamp.toTimeString() + " : " + info + " : " + JSON.stringify(body));

track = (name, kargs) ->
	if not kargs
		kargs = {}
	#xhr.open("POST", "http://104.197.78.205:9001/track/event")
	name = name.replace('/ /g',"_").replace('/:/g'," ");
	kargs.name = "server_" + name
	#xhr.send(JSON.stringify(kargs))
	kargs.hostname = os.hostname()
	request({
		url: "http://104.197.78.205:9001/track/event",
		method: 'POST',
		body: JSON.stringify(kargs)
		}, (error, response, body) ->
			if(error)
				console.log(error);
		);
