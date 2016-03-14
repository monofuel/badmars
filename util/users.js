var logger = require('./logger');
var Users = null;
var env = process.env.NODE_ENV || 'dev';
module.exports = function(authConn) {
	Users = authConn.model('User');
}

//route
module.exports.isLoggedIn = function(req, res, next) {

	//skip login check in dev for now
	if (env == 'dev') {
		console.log('dev login');
		req.user = {
			username: "monofuel",
			admin: true
		};
		return next();
	}

	// if user is authenticated in the session, move along
	// these are not the droids you are looking for
	if (req.isAuthenticated()) {
		return next();
	}

	// if they aren't redirect them to the home page
	logger.info('rejecting access to ' + req.url, req);
	res.redirect(403, '/');
}


module.exports.getUserDoc = function(id) {
	return Users.findById(id);

}
