#Monofuel
'use-strict';

module.exports = {
  land: 0
  cliff: 1
  water: 2
  coast: 3

  getTypeName: (type) ->
    switch (type)
      when @land
        return 'land'
      when @cliff
        return 'cliff'
      when @water
        return 'water'
      when @coast
        return 'coast'
      else
        return 'unknown'
}
