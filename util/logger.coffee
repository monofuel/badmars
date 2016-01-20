# @param [Object] err javascript error object
module.exports.error = (err) ->
  timestamp = new Date();
  console.log(timestamp.toTimeString() + " : " + err.stack);
  #TODO do more stuff like log it to a database and fancy stuff

# @param [String] info message to log
module.exports.info = (info, req) ->
  timestamp = new Date();

  if (req)
    if (req.isAuthenticated())
      console.log("INFO: " + timestamp.toTimeString() + " : " + info + " FROM: " + req.ip + " USER: " + req.user.username);
    else
      console.log("INFO: " + timestamp.toTimeString() + " : " + info + " FROM: " + req.ip);

  else
    console.log("INFO: " + timestamp.toTimeString() + " : " + info);

  #TODO do more stuff like log it to a database and fancy stuff
