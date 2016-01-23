'use-strict';

express = require('express');
path = require('path');
mongoose = require('mongoose');
favicon = require('serve-favicon');
logger = require('morgan');
passport = require('passport');
cookieParser = require('cookie-parser');
bodyParser = require('body-parser');
users = require('./routes/users');
session = require('express-session');
flash = require('connect-flash');
mongoDBStore = require('connect-mongodb-session')(session);

app = express();

#load local files
auth = require('./config/auth');
dbConfig = require('./config/db');

app.set('view engine', 'ejs');
app.set('trust proxy', true); #behind an nginx proxy

#maybe once i get a favicon
#app.use(favicon(__dirname + '/public/favicon.ico'));

app.use(logger('dev'));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));

#db connection for passport auth
serverAddress = 'mongodb://localhost/japura';
authConn = mongoose.createConnection(serverAddress);
console.log('connected to auth DB at %s',serverAddress);

require('./models/user')(authConn);
require('./util/users')(authConn);

#TODO db location should be saved in separate config
store = new mongoDBStore(
      {
        uri: 'mongodb://localhost/japura',
        collection: 'sessions'
      });

# Catch errors
store.on('error', (error) ->
  assert.ifError(error);
  assert.ok(false);
);

#load passport config
require('./config/passport')(passport,authConn);

#must be done before initializing passport
app.use(session({
  secret: auth.secret,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7 # 1 week
  },
  store: store
}));

app.use(passport.initialize());
app.use(passport.session());

#for express-flash
app.use(flash());

app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

require('./routes/main')(app);
app.use('/users', users);
require('./routes/worlds')(app);
require('./routes/planets')(app);

server = app.listen(3002,  () ->
  host = server.address().address;
  port = server.address().port;

  console.log('Express listening at http://%s:%s', host, port);
);

module.exports = app;
