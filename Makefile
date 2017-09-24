
grpc:
	protoc -I server/protos server/protos/* --go_out=plugins=grpc:server/go/services

public/js/index.js:
	 browserify  ./client/badmars/client.ts -p tsify --debug -o ./bin/public/badmars/js/badmars.js

watchClient:
	 watchify ./client/badmars/client.ts -p tsify -v --debug -o ./bin/public/badmars/js/badmars.js

watchHomepage:
	 watchify ./client/homepage/main.tsx -p tsify -v --debug -o ./bin/public/badmars/js/homepage.js

watchDashboard:
	 watchify ./client/dashboard/index.jsx -t babelify -p tsify -p livereactload --debug -o ./bin/public/dashboard/js/index.js

check:
	go vet .
	flow check
	node_modules/eslint/bin/eslint.js -c .eslintrc.json server/

test:
	go test -cover

nodeSetup:
	yarn install

goSetup:
	go get github.com/gorilla/mux
	go get github.com/gorilla/handlers
	go get github.com/pkg/errors
	go get github.com/google/uuid
	go get google.golang.org/grpc
	go get gopkg.in/dancannon/gorethink.v2

setup: goSetup nodeSetup

prepareBin:
	cp -r server/protos bin/
	mkdir -p bin/server/nodejs/config/
	cp server/nodejs/config/*.json bin/server/nodejs/config/
	mkdir -p bin/server/nodejs/web/views/
	cp -r server/nodejs/web/views bin/server/nodejs/web/
	cp -r ./public bin/

buildServer: prepareBin buildChunk buildAI buildNet buildPathfinder buildValidator buildWeb buildSchema

buildChunk: 
	browserify ./server/nodejs/chunk.ts -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/chunk.js --node --im --debug

buildAI: 
	browserify ./server/nodejs/ai.ts -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/ai.js --node --im --debug

buildNet: 
	browserify ./server/nodejs/net.ts -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/net.js --node --im --debug

buildWeb:
	browserify ./server/nodejs/web.ts -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/web.js --node --im --debug

buildPathfinder: 
	browserify ./server/nodejs/pathfinder.ts -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/pathfinder.js --node --im --debug

buildValidator:
	browserify ./server/nodejs/validator.ts -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/validator.js --node --im --debug

buildSchema:
	browserify ./server/nodejs/schema.ts -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/schema.js --node --im --debug

# TODO build for go services

watchServer: prepareBin watchChunk watchAI watchNet watchWeb watchPathfinder watchValidator watchWeb watchSchema

watchChunk: 
	watchify ./server/nodejs/chunk.ts -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/chunk.js --node --im --debug -v

watchAI: 
	watchify ./server/nodejs/ai.ts -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/ai.js --node --im --debug -v

watchNet: 
	watchify ./server/nodejs/net.ts -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/net.js --node --im --debug -v

watchWeb: 
	watchify ./server/nodejs/web.ts -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/web.js --node --im --debug -v

watchPathfinder: 
	watchify ./server/nodejs/pathfinder.ts -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/pathfinder.js --node --im --debug -v

watchValidator: 
	watchify ./server/nodejs/validator.ts -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/validator.js --node --im --debug -v

watchSchema: 
	watchify ./server/nodejs/schema.ts -t babelify -p tsify -p mapstraction -o ./bin/server/nodejs/schema.js --node --im --debug -v

# TODO add watch for go services

#--------------------------------------------
#commands that use docker

dockerBuildPrepare:
	docker-compose -f docker-compose-build.yml build

dockerBuild: dockerBuildPrepare
	docker-compose -f docker-compose-build.yml run node-build make buildServer -j 4

dockerWatch: dockerBuildPrepare
	 docker-compose -f docker-compose-build.yml run node-build make watchServer -j 10