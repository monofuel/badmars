
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
	make -j 2 apiTest run

apiTest:
	bash -c 'while [[ "`curl -s -o /dev/null -w '%{http_code}' localhost:3002/_health`" != "200" ]]; do sleep 1; done'
	echo 'SERVER READY'
	bash -c 'cd ./tests && BADMARS_SERVER="localhost:3002" go run *.go'

	# hacky, kills the test server
	# this used so the CI server can run 'make test' and automagically work
	ps aux | grep 'node standalone.js' | grep -v grep | awk '{print $$2}' | xargs kill
	# bash -c "ps aux | grep 'node standalone.js' | awk '{print $$2}' | xargs kill -9"

run:
	bash -c 'cd ./bin/server/nodejs && node standalone.js'

nodeSetup:
	yarn install


# go deps are listed in here to streamline docker image rebuilding
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