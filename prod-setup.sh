#!/bin/bash
#monofuel
#3-2016

#install tools
sudo apt-get install make vim git nodejs npm

#debian crap
sudo ln -s /usr/bin/nodejs /usr/bin/node
if [ ! -d "~/badMars-JS" ]; then
  git clone https://github.com/monofuel/badMars-JS ~/badMars-JS
fi

cd ~/badMars-JS

git fetch --all
git reset --hard origin/master
git clean -f -d

npm install
sudo npm install -g gulp codo supervisor

cd ./client && npm install

cd ~/badMars-JS
make

supervisor node badMars.js
