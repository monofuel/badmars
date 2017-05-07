
grpc:
	protoc -I server/protos server/protos/master.proto --go_out=plugins=grpc:server/go/service/master
	protoc -I server/protos server/protos/chunk.proto --go_out=plugins=grpc:server/go/service/chunk
	protoc -I server/protos server/protos/ai.proto --go_out=plugins=grpc:server/go/service/ai

client:
	BABEL_ENV=production gulp client

watchClient:
	 watchify ./client/badmars/client.js -t babelify -p livereactload -o ./public/badmars/js/badmars.js

watchDashboard:
	 watchify ./client/dashboard/index.jsx -t babelify -p livereactload -o ./public/dashboard/js/index.js

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
	cp -r server/protos bin/protos
	cp -r server/nodejs/config/*.json bin/server/nodejs/config/
	cp -r server/nodejs/web/views bin/server/nodejs/web/views
	cp -r ./public bin/public

buildServer: prepareBin
	babel server/nodejs -d bin/server/nodejs

watchServer: prepareBin
	babel server/nodejs -d bin/server/nodejs --watch

	# does not work correctly yet
	#sh ./buildWatch.sh

#--------------------------------------------
#commands that use docker

dockerBuildPrepare:
	 docker build -t badmars-node-build -f ./Dockerfile-node-build .

dockerBuild: dockerBuildPrepare
	 docker run -v `pwd`/bin:/badmars/bin -v `pwd`/server:/badmars/server badmars-node-build make buildServer

dockerWatch: dockerBuildPrepare
	 docker run  -v `pwd`/bin:/badmars/bin -v `pwd`/server:/badmars/server badmars-node-build make watchServer