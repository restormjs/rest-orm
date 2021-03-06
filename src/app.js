var express = require('express');
var logger = require('morgan');
var config = require('./config')
var apiRouter = require('./routes');

var app = express();
app.use(logger('dev', {stream: console.stdout} ));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(config.api.path_prefix, apiRouter);

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  var status = err.status || 500
  if (status >= 500) {
    console.error(err)
  }

  res.status(status);
  res.setHeader("Content-Type", "application/json");

  res.send({
    message: err.message,
    status: status,
    details: err.stack, // TODO: Remove from prod
    timestamp: new Date()
  })
});

module.exports = app;
