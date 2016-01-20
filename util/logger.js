module.exports.error = function(err) {
  var timestamp;
  timestamp = new Date();
  return console.log(timestamp.toTimeString() + " : " + err.stack);
};

module.exports.info = function(info, req) {
  var timestamp;
  timestamp = new Date();
  if (req) {
    if (req.isAuthenticated()) {
      return console.log("INFO: " + timestamp.toTimeString() + " : " + info + " FROM: " + req.ip + " USER: " + req.user.username);
    } else {
      return console.log("INFO: " + timestamp.toTimeString() + " : " + info + " FROM: " + req.ip);
    }
  } else {
    return console.log("INFO: " + timestamp.toTimeString() + " : " + info);
  }
};
