all: core_js routes_js models_js docs
	cd client && gulp transpile

start: all
	supervisor badMars.js

core_js:
	coffee -cb ./*.coffee

routes_js:
	coffee -cb ./routes/*.coffee

models_js:
	coffee -cb ./models/*.coffee

docs:
	codo -o public/docs *.coffee routes/*.coffee models/*.coffee

clean:
	rm badMars.js buildings.js db.js net.js units.js worldGenerator.js app.js 2> /dev/null || true
	rm -r ./public/docs || true
	rm -r client/badmars/*.js 2> /dev/null || true
	rm routes/*.js 2> /dev/null || true
	rm models/world.js 2> /dev/null || true
	cd client && $(MAKE) clean
