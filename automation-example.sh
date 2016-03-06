#!/bin/bash
#example script to use in the automation field

useradd -m badmars
mkdir -p ~badmars/badMars-JS/config
echo "module.exports = {
{{CONTENTS OF AUTH.JS}}
}" >> ~badmars/badMars-JS/config/auth.js


chown badmars ~badmars/badMars-JS/config/auth.js

curl https://raw.githubusercontent.com/monofuel/badMars-JS/master/prod-setup.sh | sh

su badmars -c 'curl https://raw.githubusercontent.com/monofuel/badMars-JS/master/prod-start.sh | sh' &
