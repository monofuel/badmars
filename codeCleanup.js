// author: monofuel
// script to check over code for sanity
'use strict';
const fs = require('fs');
const path = require('path');
const _ = require('lodash');

const STRICT = true;

// only checking over ES6 flowtyped code
// dependencies and non-babelified code are not checked
const IGNORE = [
  'client/', //TODO remove this
  'node_modules',
  'dependencies',
	'codeCleanup.js',
  'gulpFile.js',
  'server/ai.js',
  'server/app.js',
  'server/chunk.js',
  'server/commander.js',
  'server/net.js',
  'server/web.js',
  'server/pathfinder.js',
  'server/simulate.js',
  'server/validator.js',
  'server/testapi.js',
  'badmars/badmars-v1.js',
  'public/js/index.js',
	'commands.js' // uses libraries that do not mix well with flow
];

//TODO once we get a few things checked, perhaps refactor this code to be more efficient
// i think there might be a lot of checks that look at every line in the future

function main() {
	let count = 0;

	count += checkFlowAnnotation();
	count += checkRequires();
	count += noStrict();
	count += nojsimport();
	count += letType();

	console.log('=============================');
	console.log(count + ' issues detected');
}

main();

function checkFlowAnnotation() {
	let count = 0;
	// assert that all files are flowtyped
	recurseDir('./', ['.js'], (file) => {
		const contents = fs.readFileSync(file, 'utf8').toString().split('\n');
		const firstLine = contents[0];
		if(firstLine !== '/* @flow */' && firstLine !== '/* @flow weak */') {
			console.log('=============================');
			console.log('file does not start with /* @flow */');
			console.log(file)
			console.log('found: ', firstLine);
			count++;
		} else if(STRICT && firstLine !== '/* @flow weak */') {
			console.log('=============================');
			console.log('file is weakly flowtyped');
			console.log(file);
			count++;
		}
	});
	return count;
}

function checkRequires() {
	let count = 0;
	// prefer imports over require for code consistency in babelified code
	recurseDir('./', ['.js'], (file) => {
		const badLines = [];
		const re = /(const|var|let).*require\(.*\)/g
		const contents = fs.readFileSync(file, 'utf8').toString().split('\n');
		_.each(contents, (line, index) => {
			if(re.test(line)) {
				badLines.push(index + ': ' + line);
			}
		});
		if(badLines.length !== 0) {
			console.log('=============================');
			console.log('file has requires, replace with import for consistency');
			console.log(file);
			_.each(badLines, (line) => console.log(line));
			count += badLines.length;
		}
	});
	return count;
}

function noStrict() {
	let count = 0;
	// strict is added through "transform-strict-mode"
	// so we should not have 'use strict' in any file.
	recurseDir('./', ['.js'], (file) => {
		const badLines = [];
		const re = /'use.strict'/g
		const contents = fs.readFileSync(file, 'utf8').toString().split('\n');
		_.each(contents, (line, index) => {
			if(re.test(line)) {
				badLines.push(index + ': ' + line);
			}
		});
		if(badLines.length !== 0) {
			console.log('=============================');
			console.log('file use strict, unnecessary');
			console.log(file);
			_.each(badLines, (line) => console.log(line));
			count += badLines.length;
		}
	});
	return count;
}

function nojsimport() {
	let count = 0;
	// strict is added through "transform-strict-mode"
	// so we should not have 'use strict' in any file.
	recurseDir('./', ['.js'], (file) => {
		const badLines = [];
		const re = /import.*from.*'.*\.js'/g
		const contents = fs.readFileSync(file, 'utf8').toString().split('\n');
		_.each(contents, (line, index) => {
			if(re.test(line)) {
				badLines.push(index + ': ' + line);
			}
		});
		if(badLines.length !== 0) {
			console.log('=============================');
			console.log('import file with .js, not needed');
			console.log(file);
			_.each(badLines, (line) => console.log(line));
			count += badLines.length;
		}
	});
	return count;
}

function letType() {
	let count = 0;
	// typing variables are optional, however enforce them anyway
	recurseDir('./', ['.js'], (file) => {
		const badLines = [];
		const re = /(var|const|let)[^:]*;/g
		const contents = fs.readFileSync(file, 'utf8').toString().split('\n');
		_.each(contents, (line, index) => {
			if(re.test(line)) {
				badLines.push(index + ': ' + line);
			}
		});
		if(badLines.length !== 0) {
			console.log('=============================');
			console.log('please type your variables');
			console.log(file);
			_.each(badLines, (line) => console.log(line));
			count += badLines.length;
		}
	});
	return count;
}


//=============================
// helper functions
//=============================

function recurseDir(dir, fileTypes, fileFunc) {
	if(!dir || !fileTypes || !fileFunc) {
		console.log('bad args for recurseDir', dir, fileTypes, fileFunc);
	}
	const files = fs.readdirSync(dir);
	files.forEach((file) => {

		const filePath = path.resolve(dir, file);
		if(_.find(IGNORE, (filter) => { return filePath.includes(filter) })) {
			return;
		}
		const stat = fs.statSync(filePath);
		if(stat.isDirectory()) {
			recurseDir(filePath, fileTypes, fileFunc);
		}
		if(stat.isFile()) {
			_.each(fileTypes, (type) => {
				if(file.endsWith(type)) {
					fileFunc(filePath);
				}
			})
		}
	})
}
