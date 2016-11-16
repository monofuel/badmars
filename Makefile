run: client server check
	go run main.go

server: goSetup
	go get
	go fmt
	go build

grpc:
	protoc -I protos protos/master.proto --go_out=plugins=grpc:service/master
	protoc -I protos protos/chunk.proto --go_out=plugins=grpc:service/chunk
	protoc -I protos protos/ai.proto --go_out=plugins=grpc:service/ai


client:
	BABEL_ENV=production gulp

watchClient:
	 watchify ./client/badmars-v1/client.js -t babelify -p livereactload -o ./server/public/js/badmars/badmars-v1.js

watchDashboard:
	 watchify dashboard-frontend/js/index.jsx -t babelify -p livereactload -o ./dashboard-frontend/public/js/index.js

check:
	go vet .
	flow check

test:
	go test -cover

goSetup:
	go get
	cd core/simulate && go get
	cd core/dashboard && go get

setup: goSetup
	npm install
	cd client && make copy

saferun: setup run
