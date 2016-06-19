var gulp = require('gulp');
var browserify = require('browserify');
var flow = require('gulp-flowtype');
var fs = require("fs");

var paths = {
	scripts: ['badmars-v1/*.js*', 'badmars-v1/*/*.js*']
};


gulp.task('default', ['transpile']);

gulp.task('transpile', function() {
	return browserify('badmars-v1/client.js')
		.transform("babelify", {
			presets: ["react", "es2015", "stage-0"],
			plugins: ["transform-flow-strip-types"]
		})

	.bundle()
		.pipe(fs.createWriteStream('../server/public/js/badmars/badmars-v1.js'));
});

gulp.task('watch', ['transpile'], function() {
	gulp.watch(paths.scripts, ['transpile']);
});
