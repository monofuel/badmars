all: core_js routes_js public_js

start: all
	supervisor badMars.js

watch: watch_core_js watch_routes_js

core_js: ./*.coffee
	coffee -cb ./*.coffee

routes_js: ./routes/*.coffee
	coffee -cb ./routes/*.coffee

public_js: ./public/js/*.coffee
	coffee -cb ./public/js/*.coffee

watch_core_js: ./*.coffee
	coffee -wcb ./*.coffee &

watch_routes_js: ./routes/*.coffee
	coffee -wcb ./routes/*.coffee &

watch_public_js: ./public/js/*.coffee
	coffee -wcb ./public/js/*.coffee
