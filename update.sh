#!/bin/bash
#monofuel
#3-2016

echo "running update"

#pull latest changes
git pull origin master

cd ./client
npm install
make copy
make planet_viewer_build

cd ~/badMars-JS
npm install
make
