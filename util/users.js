var logger = require('./logger');

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
