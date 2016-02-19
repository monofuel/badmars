var gulp = require('gulp');
var browserify = require('browserify');
var fs = require("fs");

gulp.task('default', function () {

	browserify('badmars-v1/client.js')
		.transform("babelify", {
			presets: ["es2015", "stage-0"],
			plugins: ["transform-flow-strip-types"]
		})
		.bundle()
		.pipe(fs.createWriteStream('../public/js/badmars/badmars-v1.js'));
})
