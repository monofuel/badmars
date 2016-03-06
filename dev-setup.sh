#!/bin/bash
#monofuel
#3-2016

#setup the development environment

#install tools
sudo apt-get --assume-yes install make vim git coffeescript npm nodejs tmux

#debian crap
sudo ln -s /usr/bin/nodejs /usr/bin/node

npm install
sudo npm install -g gulp codo nodemon

cd ./client && npm install
