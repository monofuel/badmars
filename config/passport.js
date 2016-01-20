//Monofuel 2015
'use strict';


var LocalStrategy = require('passport-local').Strategy;
var mongoose = require('mongoose');

//with a little help from
//https://scotch.io/tutorials/easy-node-authentication-google

var configAuth = require('./auth');

module.exports = function(passport,authConn) {
  var User = authConn.model("User");
  passport.serializeUser(function(user,done) {
    done(null,user.id);
  });

  passport.deserializeUser(function(id,done) {
    //console.log('deserializing user: ' + id)
    User.findById(id ,function(err,user) {
      //console.log('deserialized')
      //console.log(user)
      done(err,user);
    });
  });

};
