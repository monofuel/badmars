#!/bin/bash
#monofuel
#3-2016

#run as root

#setup a production environment and start the game server

#install tools
apt-get --assume-yes  install make vim git nodejs npm tmux

#debian crap
ln -s /usr/bin/nodejs /usr/bin/node

npm install -g gulp codo nodemon
