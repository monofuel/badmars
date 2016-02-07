all: copy docs

build: planet_viewer

planet_viewer:
	coffee -o ../public/js/badmars/ -cb planet_viewer/*.coffee

badmars_v1:
	flow check badmars-v1/
	browserify badmars-v1/*.js dependencies/three.min.js -t babelify --outfile ../public/js/badmars-v1.js

copy: build
	cp -r dependencies/ ../public/js/badmars
	cp -r models/ ../public

docs:
	codo -vu -o ../public/clientdocs planet_viewer/*.coffee

clean:
	rm -r ../public/js/planet_viewer 2> /dev/null || true
	rm -r ../public/clientdocs 2> /dev/null || true
