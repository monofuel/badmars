all: core_js routes_js

start: all
	nodejs badMars.js

core_js: ./*.coffee
	coffee -cb ./*.coffee

routes_js: ./routes/*.coffee
	coffee -cb ./routes/*.coffee
