'use strict';
mongoose = require('mongoose')
users = require('./util/users')
Planet = mongoose.model('Planet')

#list of units
#
#name of unit
#range of attack in tiles
#speed of unit in tiles per second
#total hp of unit
#attack power of unit
#cost of the unit
#

Units = [
  {
    name: 'tank',
    range: 5.0,
    speed: 2.0,
    hp: 50,
    attack: 10,
    cost: 500
  },{
    name: 'scout',
    range: 5.0,
    speed: 4.0,
    hp: 20,
    attack: 2,
    cost: 100
  },{
    name: 'builder',
    range: 1.0,
    speed: 1.2,
    hp: 100,
    attack: 0,
    cost: 300
  },{
    name: 'transport',
    range: 1.0,
    speed: 1.0,
    hp: 300,
    attack: 0,
    cost: 200
  }
]

#TODO: this might need to be re-done as a hashmap
exports.get = (name) ->
  for item in Units
    if item.name == name
      return item

exports.list = () ->
  list = []
  for item in Units
    list.push(item.name)
  return list

#TODO: should probably standardise on using id's instead of names for everything
# @param [String] player id of the player to spawn
# @param [String] planet name of the planet to spawn the player on
# @return [Promise]
exports.spawnPlayer = (userId,planetName) ->
  userDoc = null;
  planetDoc = null;

  return users.getUserDoc(userId)
  .then((doc) ->
    userDoc = doc;
    if (!userDoc)
      #very bad error, possibly hints at an issue with authentication
      err = new Error('no such user found');
      logger.error(err);
      throw err;
    return Planet.findOne({name: planetName})
  ).then((planet) ->
    planetDoc = planet;
    if (!planetDoc)
      throw err('invalid planet specified');
    console.log('requested spawn for ',userDoc.username,'and planet',planetDoc.name);
  )
