express = require('express');
path = require('path');
favicon = require('serve-favicon');
logger = require('morgan');
cookieParser = require('cookie-parser');
bodyParser = require('body-parser');
users = require('./routes/users');

app = express();

app.set('view engine', 'ejs');

#maybe once i get a favicon
#app.use(favicon(__dirname + '/public/favicon.ico'));

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));

app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

require('./routes/main')(app);
app.use('/users', users);
require('./routes/worlds')(app);

server = app.listen(3002,  () ->
  host = server.address().address;
  port = server.address().port;

  console.log('Express listening at http://%s:%s', host, port);
);

module.exports = app;
