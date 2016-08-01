#!/bin/bash
echo stopping

docker stop badmars-pathfinder-dev
docker stop badmars-simulate-dev
docker stop badmars-net-dev
docker stop badmars-web-dev
docker stop badmars-ai-dev
docker stop badmars-chunk-dev

docker stop badmars-net
docker stop badmars-web

echo deleting

docker rm badmars-pathfinder-dev
docker rm badmars-simulate-dev
docker rm badmars-net-dev
docker rm badmars-web-dev
docker rm badmars-ai-dev
docker rm badmars-chunk-dev

docker rm badmars-net
docker rm badmars-web

echo done
