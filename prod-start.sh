#!/bin/bash
#monofuel
#3-2016

#run as badmars user

if [ ! -d "~/badMars-JS" ]; then
  git clone https://github.com/monofuel/badMars-JS ~/badMars-JS
fi

cd ~/badMars-JS
cp ~/auth.js config/

git fetch --all
git reset --hard origin/master
git clean -f -d

npm install

cd ./client
npm install
make copy
make planet_viewer_build

cd ~/badMars-JS
make

export NODE_ENV="production"

tmux new-session -d -s badmars -c ~/badMars-JS 'supervisor -w ./,util/,routes/,models/,config/ badMars.js'
