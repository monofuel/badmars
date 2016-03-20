var dateFormat, env, os, request, track;

request = require('request');

os = require('os');

env = process.env.NODE_ENV || 'dev';

process.on('uncaughtException', function(err) {
  module.exports.error(err);
  return console.log(err);
});

module.exports.error = function(err) {
  var timestamp;
  timestamp = new Date();
  console.log(dateFormat(timestamp) + " : " + err.stack);
  return track("error", {
    message: err.message,
    stack: err.stack
  });
};

module.exports.info = function(info, req) {
  var timestamp, _ref;
  timestamp = new Date();
  track(info, {
    ip: req != null ? req.ip : void 0,
    username: req != null ? (_ref = req.user) != null ? _ref.username : void 0 : void 0
  });
  if (req) {
    if (req.isAuthenticated && req.isAuthenticated()) {
      return console.log("INFO: " + dateFormat(timestamp) + ": " + info + " FROM: " + req.ip + " USER: " + req.user.username);
    } else {
      return console.log("INFO: " + dateFormat(timestamp) + ": " + info + " FROM: " + req.ip);
    }
  } else {
    return console.log("INFO: " + dateFormat(timestamp) + ": " + info);
  }
};

module.exports.serverInfo = function(info, body) {
  var timestamp;
  timestamp = new Date();
  track(info, body);
  if (body) {
    return console.log("INFO: " + dateFormat(timestamp) + ": " + info + " : " + JSON.stringify(body));
  } else {
    return console.log("INFO: " + dateFormat(timestamp) + ": " + info);
  }
};

dateFormat = function(date) {
  return date.getMonth() + "/" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes();
};

track = function(name, kargs) {
  if (!kargs) {
    kargs = {};
  }
  name = name.replace('/ /g', "_").replace('/:/g', " ");
  kargs.name = "server_" + name;
  kargs.hostname = os.hostname();
  kargs.env = env;
  return request({
    url: "http://104.197.78.205:9001/track/event",
    method: 'POST',
    body: JSON.stringify(kargs)
  }, function(error, response, body) {
    if (error) {
      return console.log(error);
    }
  });
};
