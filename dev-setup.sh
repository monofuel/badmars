#!/bin/bash
#monofuel
#3-2016

#install tools
sudo apt-get --assume-yes install make vim git coffeescript npm nodejs

#debian crap
sudo ln -s /usr/bin/nodejs /usr/bin/node

npm install
sudo npm install -g gulp codo

cd ./client && npm install
