'use strict';
var gutil = require('gulp-util');
var through = require('through2');
var generator = require('loopback-sdk-angular');
var path = require('path');
var WatchJS = require('watchjs');

var watch = WatchJS.watch;
var unwatch = WatchJS.unwatch;

//  This callback will be passed to watch, this refers to the datasource
function disconnectDataSource(prop, action, newValue) {
  if (newValue === true) {
    this.disconnect();
    unwatch(this, 'connected');
  }
}

module.exports = function (options) {
  return through.obj(function (file, enc, cb) {
      var that = this;
      if (file.isNull()) {
          that.push(file);
          cb();
          return;
      }

      var app;
      try {
          app = require(path.resolve(file.path));
      } catch (err) {
          this.emit('error', new gutil.PluginError('gulp-loopback-sdk-angular', err));
      }

      app.on('booted', runGenerator);

      function runGenerator() {
          try {
              //  Incase options is undefined.
              options = options || {ngModuleName: 'lbServices', apiUrl: undefined};

              options.ngModuleName = options.ngModuleName || 'lbServices';
              options.apiUrl = options.apiUrl || app.get('restApiRoot') || '/api';

              gutil.log('Loaded LoopBack app', gutil.colors.magenta(file.path));
              gutil.log('Generating',
                  gutil.colors.magenta(options.ngModuleName),
                  'for the API endpoint',
                  gutil.colors.magenta(options.apiUrl)
              );

              var script = generator.services(
                  app,
                  options.ngModuleName,
                  options.apiUrl
              );

              file.contents = new Buffer(script);

              gutil.log('Generated Angular services file.');

              that.push(file);

              var dataSources = app.dataSources;
              for (var dataSource in dataSources) {
                  if (dataSources.hasOwnProperty(dataSource)) {
                      var ds = dataSources[dataSource];
                      watch(ds, 'connected', disconnectDataSource);
                  }
              }
          } catch (err) {
              that.emit('error', new gutil.PluginError('gulp-loopback-sdk-angular', err));
          } finally {
              return cb();
          }
      }
  });
};
