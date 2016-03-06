#!/bin/bash
#monofuel
#3-2016

#run as root

#setup a production environment and start the game server

#install tools
apt-get install make vim git nodejs npm tmux
npm install -g gulp codo nodemon

#debian crap
ln -s /usr/bin/nodejs /usr/bin/node
