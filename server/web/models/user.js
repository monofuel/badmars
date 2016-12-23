/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

var mongoose = require('mongoose');
module.exports = (authConn) => {
	var UserSchema = new mongoose.Schema({
		username: String,
		admin: {
			type: Boolean,
			default: false
		},
		facebook: {
			id: String,
			token: String,
			name: String,
			email: String
		},
		google: {
			id: String,
			token: String,
			name: String,
			email: String
		}
	});

	authConn.model('User', UserSchema);
}
