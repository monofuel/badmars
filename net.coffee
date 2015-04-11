WebSocketServer = require('ws').Server

#TODO setup everything for ssl
exports.init = (port) ->
  wss = new WebSocketServer({port: port})
  wss.on('connection',client)

client = (ws) ->
  ws.on('message',(message) ->
    console.log('recieved: ' + message)
    )
  ws.on('error',(message) ->
    console.log('ws error: ' + message)
    )
  ws.send('hello world')

#TODO close server on exit
#wss.close()
