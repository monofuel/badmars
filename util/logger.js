var dateFormat, env, os, request, track, verifyTrack;

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

module.exports.serverInfo = function(info, body, silent) {
  var timestamp;
  timestamp = new Date();
  track(info, body);
  if (silent) {
    return;
  }
  if (body) {
    return console.log("INFO: " + dateFormat(timestamp) + ": " + info + " : " + JSON.stringify(body));
  } else {
    return console.log("INFO: " + dateFormat(timestamp) + ": " + info);
  }
};

dateFormat = function(date) {
  return date.getMonth() + "/" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes();
};

verifyTrack = function(name, kargs) {
  var key, _i, _len, _ref, _results;
  _ref = Object.keys(kargs);
  _results = [];
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    key = _ref[_i];
    console.log(typeof kargs[key]);
    if (typeof kargs[key] === 'object') {
      console.log('invalid element ' + key + ' on ' + name);
      delete kargs[key];
      _results.push(track('error', {
        msg: 'invalid element ' + key + ' on ' + name
      }));
    } else {
      _results.push(void 0);
    }
  }
  return _results;
};

track = function(name, kargs) {
  if (!kargs) {
    kargs = {};
  }
  name = name.replace('/ /g', "_").replace('/:/g', " ");
  kargs.name = "server_" + name;
  kargs.hostname = os.hostname();
  kargs.env = env;
  verifyTrack(name, kargs);
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
