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
