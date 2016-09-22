#!/bin/bash
set -euo pipefail

DIR=`pwd`

echo building docker image
cd docker
docker build -f Dockerfile-gostart -t monofuel/badmars-dev:v1 .
cd ..
docker rm badmars-dev | true
docker run -it \
	-p 0.0.0.0:8080:8080 \
	-p 0.0.0.0:3002:3002 \
	-p 0.0.0.0:7005:7005 \
	-v $DIR:/go/src/github.com/monofuel/badmars \
	--name badmars-dev \
	-t monofuel/badmars-dev:v1
