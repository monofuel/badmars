// monofuel 2017
const gulp = require('gulp');
const babel = require('gulp-babel');
const sourcemaps = require('gulp-sourcemaps');
const concat = require('gulp-concat');
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const _ = require('lodash');

const serverSrc = 'server/nodejs/**/*.js';

gulp.task('client', () => {

	return browserify({ entries: './client/badmars/client.js', debug: true })
		.transform("babelify")
		.bundle()
		.pipe(source('badmars.js'))
		.pipe(buffer())
		.pipe(gulp.dest('./public/badmars/js/'));
});

gulp.task('dashboard', () => {

	return browserify({ entries: './client/dashboard/index.jsx', debug: true })
		.transform("babelify")
		.bundle()
		.pipe(source('index.js'))
		.pipe(buffer())
		.pipe(gulp.dest('./public/dashboard/js/'));
});

gulp.task('copyProto', () => {
	return gulp.src(['server/protos/**/*'])
		.pipe(gulp.dest('bin/protos'));
})

gulp.task('copyConfig', () => {
	return gulp.src(['server/nodejs/config/units.json'])
		.pipe(gulp.dest('bin/server/nodejs/config/'));
})


gulp.task('copyPages', () => {
	return gulp.src(['server/nodejs/web/views/**/*'])
		.pipe(gulp.dest('bin/server/nodejs/web/views'));
})


function buildServer() {
	return gulp.src(serverSrc)
		.pipe(sourcemaps.init())
		.pipe(babel())
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('bin/server/nodejs/'));
}

gulp.task('build:server',['copyProto', 'copyConfig', 'copyPages'], () => {
	return buildServer();
});

gulp.task('watch:server', ['build:server'], () => {
	gulp.watch(serverSrc, ['build:server'])
})

gulp.task('default', _.concat(['client', 'dashboard']));
