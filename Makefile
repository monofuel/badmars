
build: buildServer buildClient buildHomepage

grpc:
	protoc -I server/protos server/protos/* --go_out=plugins=grpc:server/go/services

buildClient:
	cd ./client/badmars/ && webpack --debug

watchClient:
	cd ./client/badmars/ && webpack --debug -w

buildHomepage:
	cd ./client/homepage/ && webpack --debug

watchHomepage:
	cd ./client/homepage/ && webpack --debug -w


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

buildServer: prepareBin buildNode

buildNode:
	cd ./server/nodejs/ && ../../node_modules/typescript/bin/tsc

# TODO build for go services

buildTypedRuntime:
	cd ./server/nodejs && tsr -c tsconfig.json *.ts -f

watchServer: prepareBin watchNode

watchNode:
	cd ./server/nodejs/ && ../../node_modules/typescript/bin/tsc -w

# TODO add watch for go services

#--------------------------------------------
# commands that use docker

dockerBuildPrepare:
	docker-compose -f docker-compose-build.yml build

dockerBuild: dockerBuildPrepare
	docker-compose -f docker-compose-build.yml run node-build make buildServer

dockerWatch: dockerBuildPrepare
	 docker-compose -f docker-compose-build.yml run node-build make watchServer