var mongoose = require('mongoose')

module.exports = function (authConn) {
  UserSchema = new mongoose.Schema({
    username: String, //display name
    admin: { type: Boolean, default: false},
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

  authConn.model('User',UserSchema);
}
