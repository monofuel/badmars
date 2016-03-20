#!/bin/bash
#monofuel
#3-2016

#setup the development environment

#install tools
sudo apt-get --assume-yes install make vim git coffeescript npm nodejs tmux

#slightly dangerous- install nodejs 5 for latest language goodies
curl -sL https://deb.nodesource.com/setup_5.x | sudo -E bash -
sudo apt-get install -y nodejs

#debian crap
sudo ln -s /usr/bin/nodejs /usr/bin/node

npm install
sudo npm install -g gulp codo nodemon forever

cd ./client && npm install
