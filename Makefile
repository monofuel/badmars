all: core_js routes_js

start: all
	supervisor badMars.js

watch: watch_core_js watch_routes_js

core_js: ./*.coffee
	coffee -cb ./*.coffee

routes_js: ./routes/*.coffee
	coffee -cb ./routes/*.coffee

watch_core_js: ./*.coffee
	coffee -wcb ./*.coffee &

watch_routes_js: ./routes/*.coffee
	coffee -wcb ./routes/*.coffee &
