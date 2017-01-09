#files have been moved and this makefile doesn't entirely work anymore

#run: client server check
#	go run main.go

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
	node codeCleanup.sh

test:
	go test -cover

goSetup:
	cd server/go/core/simulate && go get
	cd server/go/core/dashboard && go get

setup: goSetup
	npm install

#saferun: setup run
