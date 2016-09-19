run: client server check
	go run main.go

server:
	go get
	go fmt
	go build

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
