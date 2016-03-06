#!/bin/bash
#monofuel
#3-2016

echo "running update"

#pull latest changes
git pull origin master

#rebuild things
npm install
make

cd ./client
npm install
make copy
