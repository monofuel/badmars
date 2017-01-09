#!/bin/bash
#monofuel
#3-2016

echo "running update"

#pull latest changes
git pull origin master

cd ../client
npm install
make copy

cd ~/badMars-JS
cd ./server
npm install

#processes running with nodemon or supervisor will restart
