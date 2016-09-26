const gulp = require('gulp');
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const uglify = require('gulp-uglify');

gulp.task('client', function () {

    return browserify({entries: './client/badmars-v1/client.js', debug: true})
        .transform("babelify")
        .bundle()
        .pipe(source('badmars-v1.js'))
        .pipe(buffer())
        .pipe(uglify())
        .pipe(gulp.dest('./server/public/js/badmars/'))
});

gulp.task('dashboard', function () {

    return browserify({entries: './dashboard-frontend/js/index.jsx', debug: true})
        .transform("babelify")
        .bundle()
        .pipe(source('index.js'))
        .pipe(buffer())
        .pipe(uglify())
        .pipe(gulp.dest('./dashboard-frontend/public/js/'))
});


gulp.task('default',['client','dashboard']);
