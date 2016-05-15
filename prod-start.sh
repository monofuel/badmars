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

tmux new-session -d -s badmars -c ~/badMars-JS 'nodemon -w ./,util/,routes/,models/,config/ app.js'
