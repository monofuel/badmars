all: badmars_v1 copy docs

build: planet_viewer_build

planet_viewer_build:
	coffee -o ../public/js/badmars/ -cb planet_viewer/*.coffee

badmars_v1:
	browserify badmars-v1/client.js --fast -t babelify --outfile ../public/js/badmars/badmars-v1.js

copy: build
	cp -r dependencies/ ../public/js/badmars
	cp -r models/ ../public
	cp -r sounds/ ../public

docs:
	#codo -vu -o ../public/clientdocs planet_viewer/*.coffee
	#doxx does not work with ../
	flow check badmars-v1/
	doxx -s badmars-v1/ -T ./clientdocs
	cp -r ./clientdocs ../public

clean:
	rm -r ../public/js/planet_viewer 2> /dev/null || true
	rm -r ../public/clientdocs 2> /dev/null || true
