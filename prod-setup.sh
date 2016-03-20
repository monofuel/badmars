#!/bin/bash
#monofuel
#3-2016

#run as root

#setup a production environment and start the game server

#install tools
apt-get --assume-yes  install make vim git nodejs npm tmux coffeescript

#slightly dangerous- install nodejs 5 for latest language goodies
curl -sL https://deb.nodesource.com/setup_5.x | sudo -E bash -
apt-get install -y nodejs


#debian crap
ln -s /usr/bin/nodejs /usr/bin/node

npm install -g gulp codo supervisor browserify flow
