const gulp = require('gulp');
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const _ = require('lodash');

const SERVER_MODULES = [
	'ai',
	'chunk',
	'commander',
	'net',
	'pathfinder',
	'validator'
];

gulp.task('client', function () {

	return browserify({ entries: './client/badmars/client.js', debug: true })
		.transform("babelify")
		.bundle()
		.pipe(source('badmars.js'))
		.pipe(buffer())
		.pipe(gulp.dest('./public/badmars/js/'));
});

gulp.task('dashboard', function () {

	return browserify({ entries: './client/dashboard/index.jsx', debug: true })
		.transform("babelify")
		.bundle()
		.pipe(source('index.js'))
		.pipe(buffer())
		.pipe(gulp.dest('./public/dashboard/js/'));
});

SERVER_MODULES.forEach((mod) => {
	gulp.task(mod, function () {
		return browserifyServerModule(mod);
	})
})

function browserifyServerModule(name) {
	return browserify({ entries: './server/nodejs/' + name + '.js', debug: true })
		.transform("babelify")
		.bundle()
		.pipe(source(name + '.js'))
		.pipe(buffer())
		.pipe(gulp.dest('/bin/'))
}

gulp.task('default', _.concat(['client', 'dashboard'], SERVER_MODULES));
