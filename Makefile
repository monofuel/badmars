
grpc:
	protoc -I server/protos server/protos/master.proto --go_out=plugins=grpc:server/go/service/master
	protoc -I server/protos server/protos/chunk.proto --go_out=plugins=grpc:server/go/service/chunk
	protoc -I server/protos server/protos/ai.proto --go_out=plugins=grpc:server/go/service/ai

client:
	 browserify  ./client/badmars/client.js -t babelify -p tsify --debug -o ./bin/public/badmars/js/badmars.js

watchClient:
	 watchify ./client/badmars/client.js -t babelify -p tsify -v --debug -o ./bin/public/badmars/js/badmars.js

watchDashboard:
	 watchify ./client/dashboard/index.jsx -t babelify -p tfsify -p livereactload --debug -o ./bin/public/dashboard/js/index.js

check:
	go vet .
	flow check
	node_modules/eslint/bin/eslint.js -c .eslintrc.json server/

test:
	go test -cover

goSetup:
	cd server/go/core/simulate && go get
	cd server/go/core/dashboard && go get

setup: goSetup
	npm install

prepareBin:
	cp -r server/protos bin/
	mkdir -p bin/server/nodejs/config/
	cp server/nodejs/config/*.json bin/server/nodejs/config/
	mkdir -p bin/server/nodejs/web/views/
	cp -r server/nodejs/web/views bin/server/nodejs/web/
	cp -r ./public bin/

buildServer: prepareBin buildChunk buildAI buildNet buildPathfinder buildValidator buildWeb

buildChunk:
	browserify ./server/nodejs/chunk.js -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/chunk.js --node --im --debug

buildAI:
	browserify ./server/nodejs/ai.js -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/ai.js --node --im --debug

buildNet:
	browserify ./server/nodejs/net.js -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/net.js --node --im --debug

buildWeb:
	browserify ./server/nodejs/web.js -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/web.js --node --im --debug

buildPathfinder:
	browserify ./server/nodejs/pathfinder.js -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/pathfinder.js --node --im --debug

buildValidator:
	browserify ./server/nodejs/validator.js -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/validator.js --node --im --debug

# TODO build for go services

watchServer: prepareBin watchChunk watchAI watchNet watchWeb watchPathfinder watchValidator watchWeb

watchChunk:
	watchify ./server/nodejs/chunk.js -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/chunk.js --node --im --debug -v

watchAI:
	watchify ./server/nodejs/ai.js -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/ai.js --node --im --debug -v

watchNet:
	watchify ./server/nodejs/net.js -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/net.js --node --im --debug -v

watchWeb:
	watchify ./server/nodejs/web.js -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/web.js --node --im --debug -v

watchPathfinder:
	watchify ./server/nodejs/pathfinder.js -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/pathfinder.js --node --im --debug -v

watchValidator:
	watchify ./server/nodejs/validator.js -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/validator.js --node --im --debug -v

# TODO add watch for go services

#--------------------------------------------
#commands that use docker

dockerBuildPrepare:
	 docker build -t badmars-node-build -f ./Dockerfile-node-build .

dockerBuild: dockerBuildPrepare
	 docker run -v `pwd`/bin:/badmars/bin -v `pwd`/server:/badmars/server badmars-node-build make buildServer -j 4

dockerWatch: dockerBuildPrepare
	 docker run  -v `pwd`/bin:/badmars/bin -v `pwd`/server:/badmars/server badmars-node-build make watchServer -j 10