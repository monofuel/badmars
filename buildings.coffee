#list of all buildings
#
#name of building
#size of buiding
#hp of building
#attack power of building
#range of building
#cost of building


Buildings = [
  {
    name: 'factory',
    size: 3,
    hp: 500,
    attack: 0,
    range: 0,
    cost: 750
  },{
    name: 'storage',
    size: 2,
    hp: 200,
    attack: 0,
    range: 0,
    cost: 200
  },{
    name: 'ironMine',
    size: 1,
    hp: 150,
    attack: 0,
    range: 0,
    cost: 250
  },{
    name: 'refinery',
    size: 1,
    hp: 150,
    attack: 0,
    range: 0,
    cost: 250
  }
]

#TODO: this might need to be re-done as a hashmap
exports.get = (name) ->
  for item in Buildings
    if item.name == name
      return item

exports.list = () ->
  list = []
  for item in Buildings
    list.push(item.name)
  return list
