#!/bin/bash
#monofuel
#3-2016

#run as root

#setup a production environment and start the game server

#install tools
apt-get --assume-yes  install make vim git nodejs npm tmux

#slightly dangerous- install nodejs 5 for latest language goodies
curl -sL https://deb.nodesource.com/setup_5.x | sudo -E bash -
apt-get install -y nodejs

#debian crap
ln -s /usr/bin/nodejs /usr/bin/node

npm install -g gulp nodemon browserify flow

#setup rethinkdb locally

echo "deb http://download.rethinkdb.com/apt `lsb_release -cs` main" | sudo tee /etc/apt/sources.list.d/rethinkdb.list
wget -qO- https://download.rethinkdb.com/apt/pubkey.gpg | sudo apt-key add -
sudo apt-get update
sudo apt-get install rethinkdb
