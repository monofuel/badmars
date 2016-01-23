all: copy docs

build:
	coffee -o ../public/js/badmars/ -cb badmars/*.coffee

copy: build
	cp -r dependencies/ ../public/js/badmars
	cp -r models/ ../public

docs:
	codo -v -o ../public/clientdocs badmars/*.coffee

clean:
	rm -r ../public/js/badmars 2> /dev/null || true
	rm -r ../public/clientdocs 2> /dev/null || true
