#!/bin/bash
#example script

useradd -m badmars -s /bin/bash

#set environment variables

curl https://raw.githubusercontent.com/monofuel/badMars-JS/master/prod-setup.sh | sh

su badmars -c 'curl https://raw.githubusercontent.com/monofuel/badMars-JS/master/prod-start.sh | sh' &
