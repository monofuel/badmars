

module.exports = {
  N: 0 #negative Y direction
  S: 1 #positive Y direction
  E: 2 #negative X direction
  W: 3 #positive X direction
  C: 4 #don't move
  parse: (dir) ->
    switch (dir)
      when 0
        return 'N'
      when 1
        return 'S'
      when 2
        return 'E'
      when 3
        return 'W'
      when 4
        return 'C'
}
