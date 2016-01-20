var logger = require('./logger');
var Users = null;
module.exports = function (authConn) {
  Users = authConn.model('User');
}

//route
module.exports.isLoggedIn = function (req, res, next) {

  // if user is authenticated in the session, move along
  // these are not the droids you are looking for
  if (req.isAuthenticated()) {
      return next();
  }

  // if they aren't redirect them to the home page
  logger.info('rejecting access to ' + req.url, req);
  res.redirect(403,'/');
}


module.exports.getUserDoc = function(id) {
  return Users.findById(id);

}
