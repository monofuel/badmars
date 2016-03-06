#!/bin/bash
#monofuel
#3-2016

#run as badmars user

if [ ! -d "~/badMars-JS" ]; then
  git clone https://github.com/monofuel/badMars-JS ~/badMars-JS
fi

cd ~/badMars-JS

git fetch --all
git reset --hard origin/master
git clean -f -d

npm install
sudo npm install -g gulp codo nodemon

cd ./client
npm install
make copy

cd ~/badMars-JS
make

export NODE_ENV="production"

tmux new-session -d -s japura -c ~/badMars-JS nodemon badMars.js &&
