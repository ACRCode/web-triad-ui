// include plug-ins
var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var del = require('del');
var minifyCSS = require('gulp-minify-css');
var bower = require('gulp-bower');
var sourcemaps = require('gulp-sourcemaps');

var config = {
    //ATI Uploader api
    webtriadservicesrc: ['bower_components/web-triad-sdk-for-js/lib/webTriadService.js'],
    webtriadservicebundle: 'Content//webTriadService.js' 
}

//Restore all bower packages
gulp.task('bower-restore', gulp.series(async function () {
    return bower();
}));

// Synchronously delete the output script file(s)
gulp.task('clean-vendor-scripts', gulp.series('bower-restore', async function () {
    return del([config.webtriadservicebundle]);
}));

//Create a uploader API lib
gulp.task('webtriadservice', gulp.series('clean-vendor-scripts',  async function () {
    return gulp.src(config.webtriadservicesrc)
        .pipe(concat('webTriadService.js'))
        .pipe(gulp.dest('Content/uiControls/Scripts'));
}));

//Set a default tasks 
gulp.task('default', gulp.series('webtriadservice'));
