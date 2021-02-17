var express = require('express');
var logger = require('morgan');

var apiRouter = require('./routes');

var app = express();
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/', apiRouter);

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.setHeader("Content-Type", "application/json");
  res.send({
    timestamp: new Date(),
    status: err.status || 500,
    message: err.message,
    details: err.stack // TODO: Remove from prod
  })
});

module.exports = app;
