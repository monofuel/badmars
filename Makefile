run: client server check
	go run main.go

server: grpc
	go get
	go fmt
	go build

grpc:
	protoc -I protos protos/master.proto --go_out=plugins=grpc:service/master
	protoc -I protos protos/chunk.proto --go_out=plugins=grpc:service/chunk
	protoc -I protos protos/ai.proto --go_out=plugins=grpc:service/ai


client:
	BABEL_ENV=production gulp build

watchClient:
	 watchify ./client/badmars-v1/client.js -t babelify -p livereactload -o ./server/public/js/badmars/badmars-v1.js

watchDashboard:
	 watchify dashboard/js/index.jsx -t babelify -p livereactload -o ./dashboard/public/js/index.js

check:
	go vet .
	go test -cover
	flow check
