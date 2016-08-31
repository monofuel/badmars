#!/bin/bash
#monofuel
#3-2016

#setup the development environment

#install tools
sudo apt-get update
sudo apt-get --assume-yes install make vim git npm nodejs tmux

#slightly dangerous- install nodejs 5 for latest language goodies
curl -sL https://deb.nodesource.com/setup_5.x | sudo -E bash -
sudo apt-get install -y nodejs

#debian crap
sudo ln -s /usr/bin/nodejs /usr/bin/node

sudo npm install -g gulp nodemon browserify flow

#install rethinkdb (not needed if db is on a separate machine)
echo "deb http://download.rethinkdb.com/apt `lsb_release -cs` main" | sudo tee /etc/apt/sources.list.d/rethinkdb.list
wget -qO- https://download.rethinkdb.com/apt/pubkey.gpg | sudo apt-key add -
sudo apt-get update
sudo apt-get install rethinkdb
