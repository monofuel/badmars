#!/bin/bash
#monofuel
#3-2016

#run as badmars user

#all auth stuff is passed through with environment variables

if [ ! -d "~/badMars-JS" ]; then
  git clone https://github.com/monofuel/badMars-JS ~/badMars-JS
fi

cd ~/badMars-JS

git fetch --all
git reset --hard origin/master
git clean -f -d

cd ~/badMars-JS/client
npm install
gulp transpile
make copy

cd ~/badMars-JS/server
npm install

export NODE_ENV="production"
export AI_HOST='localhost'
export MAP_HOST='localhost'
export BADMARS_DB='localhost'

tmux new-session -d -s badmars-ai -c ~/badMars-JS/server 'nodemon ai.js'
tmux new-session -d -s badmars-ai -c ~/badMars-JS/server 'nodemon pathfinder.js'
tmux new-session -d -s badmars-ai -c ~/badMars-JS/server 'nodemon chunk.js'
tmux new-session -d -s badmars-ai -c ~/badMars-JS/server 'nodemon net.js'
tmux new-session -d -s badmars-ai -c ~/badMars-JS/server 'nodemon web.js'
