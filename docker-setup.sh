#!/bin/bash

echo building docker image
cd docker
docker build -f Dockerfile-dev -t monofuel/badmars-js-dev:v3 .
cd ..

echo starting rethinkdb
docker create -p 0.0.0.0:8090:8080 --restart always --name badmars-rethinkdb -t rethinkdb
docker start rethinkdb

echo creating badmars
docker create --link badmars-rethinkdb:rethinkdb \
	--name badmars-chunk-dev \
	-h badmars-chunk-dev \
	--restart always \
	-v /home/monofuel/code/src/github.com/monofuel/badMars-JS:/badmars \
	-t monofuel/badmars-js-dev:v3 nodemon -L /badmars/server/chunk.js
docker create --link badmars-rethinkdb:rethinkdb \
	--link badmars-chunk-dev:badmars-chunk \
	--name badmars-ai-dev \
	-h badmars-ai \
	--restart always \
	-v /home/monofuel/code/src/github.com/monofuel/badMars-JS:/badmars \
	-t monofuel/badmars-js-dev:v3 nodemon -L /badmars/server/ai.js

#lan facing dev
docker create -p 0.0.0.0:3002:3002 \
	--link badmars-rethinkdb:rethinkdb \
	--link badmars-chunk-dev:badmars-chunk \
	--name badmars-web-dev \
	--restart always \
	-v /home/monofuel/code/src/github.com/monofuel/badMars-JS:/badmars \
	-t monofuel/badmars-js-dev:v3 nodemon -L /badmars/server/web.js
docker create -p 0.0.0.0:7005:7005 \
--link badmars-rethinkdb:rethinkdb \
--link badmars-chunk-dev:badmars-chunk \
--name badmars-net-dev \
--restart always \
-v /home/monofuel/code/src/github.com/monofuel/badMars-JS:/badmars \
-t monofuel/badmars-js-dev:v3 nodemon -L /badmars/server/net.js

docker create --link badmars-rethinkdb:rethinkdb --link badmars-chunk-dev:badmars-chunk  --link badmars-ai-dev:badmars-ai --name badmars-simulate-dev --restart always -v /home/monofuel/code/src/github.com/monofuel/badMars-JS:/badmars -t monofuel/badmars-js-dev:v3 nodemon -L /badmars/server/simulate.js
docker create --link badmars-rethinkdb:rethinkdb --link badmars-chunk-dev:badmars-chunk  --link badmars-ai-dev:badmars-ai --name badmars-pathfinder-dev --restart always -v /home/monofuel/code/src/github.com/monofuel/badMars-JS:/badmars -t monofuel/badmars-js-dev:v3 nodemon -L /badmars/server/pathfinder.js

#public facing
docker create -p 0.0.0.0:3012:3002 \
	--link badmars-rethinkdb:rethinkdb \
	--link badmars-chunk-dev:badmars-chunk \
	--name badmars-web \
	--restart always \
	-e BADMARS_WS_PUBLIC_PORT='7006' \
	-e BADMARS_WS_SERVER='wss://japura.net' \
	-v /home/monofuel/code/src/github.com/monofuel/badMars-JS:/badmars \
	-t monofuel/badmars-js-dev:v3 node /badmars/server/web.js

docker create -p 0.0.0.0:7004:7005 \
--link badmars-rethinkdb:rethinkdb \
--link badmars-chunk-dev:badmars-chunk \
--name badmars-net \
--restart always \
-v /home/monofuel/code/src/github.com/monofuel/badMars-JS:/badmars \
-t monofuel/badmars-js-dev:v3 node /badmars/server/net.js

echo starting badmars

docker start badmars-chunk-dev
sleep 5s
docker start badmars-ai-dev
sleep 5s
docker start badmars-pathfinder-dev
docker start badmars-simulate-dev
docker start badmars-net-dev
docker start badmars-web-dev

docker start badmars-net
docker start badmars-web
