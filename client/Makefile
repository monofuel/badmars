all: copy docs

build:
	coffee -o ../public/js/planet_viewer/ -cb badmars/*.coffee

copy: build
	cp -r dependencies/ ../public/js/badmars
	cp -r models/ ../public

docs:
	codo -vu -o ../public/clientdocs badmars/*.coffee

clean:
	rm -r ../public/js/planet_viewer 2> /dev/null || true
	rm -r ../public/clientdocs 2> /dev/null || true
