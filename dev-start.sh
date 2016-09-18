#!/bin/bash
#boot up the whole dev server on one machine

#game web server at http://localhost:3002/badMars_v1
#rethinkdb web on port http://localhost:8080/

#set any extra environment variables in here
export BADMARS_DB='localhost'
export AI_HOST='localhost'
export MAP_HOST='localhost'
export BADMARS_WS_SERVER=wss://japura.net
export BADMARS_WS_PUBLIC_PORT=7006


#start up the whole dev system in tmux
tmux new-session -s badmars -d bash
tmux new-window 'rethinkdb'
tmux new-window 'cd server && supervisor chunk.js'
sleep 10s #give it a bit to initialize the database on first run
tmux new-window 'cd server && supervisor ai.js'
tmux new-window 'cd server && supervisor net.js'
tmux new-window 'cd server && supervisor web.js'
tmux new-window 'cd server && supervisor pathfinder.js'
tmux new-window 'cd server && supervisor  simulate.js'
tmux new-window 'cd server && supervisor  validator.js'

#run tmux attach after the script finishes
