
grpc:
	protoc -I server/protos server/protos/master.proto --go_out=plugins=grpc:server/go/service/master
	protoc -I server/protos server/protos/chunk.proto --go_out=plugins=grpc:server/go/service/chunk
	protoc -I server/protos server/protos/ai.proto --go_out=plugins=grpc:server/go/service/ai

client:
	 browserify  ./client/badmars/client.ts -p tsify --debug -o ./bin/public/badmars/js/badmars.js

watchClient:
	 watchify ./client/badmars/client.ts -p tsify -v --debug -o ./bin/public/badmars/js/badmars.js

watchDashboard:
	 watchify ./client/dashboard/index.jsx -t babelify -p tfsify -p livereactload --debug -o ./bin/public/dashboard/js/index.js

check:
	go vet .
	flow check
	node_modules/eslint/bin/eslint.js -c .eslintrc.json server/

test:
	go test -cover

nodeSetup:
	yarn install

goSetup:
	cd server/go/core/simulate && go get
	cd server/go/core/dashboard && go get

setup: goSetup nodeSetup

prepareBin:
	cp -r server/protos bin/
	mkdir -p bin/server/nodejs/config/
	cp server/nodejs/config/*.json bin/server/nodejs/config/
	mkdir -p bin/server/nodejs/web/views/
	cp -r server/nodejs/web/views bin/server/nodejs/web/
	cp -r ./public bin/

buildServer: prepareBin buildChunk buildAI buildNet buildPathfinder buildValidator buildWeb buildSchema

buildChunk: nodeSetup
	browserify ./server/nodejs/chunk.js -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/chunk.js --node --im --debug

buildAI: nodeSetup
	browserify ./server/nodejs/ai.js -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/ai.js --node --im --debug

buildNet: nodeSetup
	browserify ./server/nodejs/net.js -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/net.js --node --im --debug

buildWeb: nodeSetup
	browserify ./server/nodejs/web.js -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/web.js --node --im --debug

buildPathfinder: nodeSetup
	browserify ./server/nodejs/pathfinder.js -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/pathfinder.js --node --im --debug

buildValidator: nodeSetup
	browserify ./server/nodejs/validator.js -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/validator.js --node --im --debug

buildSchema: nodeSetup
	browserify ./server/nodejs/schema.js -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/schema.js --node --im --debug

# TODO build for go services

watchServer: prepareBin watchChunk watchAI watchNet watchWeb watchPathfinder watchValidator watchWeb watchSchema

watchChunk: nodeSetup
	watchify ./server/nodejs/chunk.js -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/chunk.js --node --im --debug -v

watchAI: nodeSetup
	watchify ./server/nodejs/ai.js -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/ai.js --node --im --debug -v

watchNet: nodeSetup
	watchify ./server/nodejs/net.js -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/net.js --node --im --debug -v

watchWeb: nodeSetup
	watchify ./server/nodejs/web.js -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/web.js --node --im --debug -v

watchPathfinder: nodeSetup
	watchify ./server/nodejs/pathfinder.js -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/pathfinder.js --node --im --debug -v

watchValidator: nodeSetup
	watchify ./server/nodejs/validator.js -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/validator.js --node --im --debug -v

watchSchema: nodeSetup
	watchify ./server/nodejs/schema.js -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/schema.js --node --im --debug -v

# TODO add watch for go services

#--------------------------------------------
#commands that use docker

dockerBuildPrepare:
	docker-compose -f docker-compose-build.yml build

dockerBuild: dockerBuildPrepare
	docker-compose -f docker-compose-build.yml run node-build make buildServer -j 2

dockerWatch: dockerBuildPrepare
	 docker-compose -f docker-compose-build.yml run node-build make watchServer -j 10