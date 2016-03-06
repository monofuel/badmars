#!/bin/bash
#example script to use in the automation field

mkdir -p ~/badMars-JS/config
echo "module.exports = {
{{CONTENTS OF AUTH.JS}}
}" >> ~/badMars-JS/config/auth.js

curl https://raw.githubusercontent.com/monofuel/badMars-JS/master/prod-setup.sh | sh
