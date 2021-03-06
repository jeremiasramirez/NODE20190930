var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var fs = require('fs');
var formidable = require("formidable");
var mysql = require('mysql')
const jwt = require('jsonwebtoken')

const APP_SECRET = 'Es segura al 99%'
const AUTHENTICATION_SCHEME = 'Bearer '


var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var demosRouter = require('./routes/demos');
var personasRouter = require('./routes/personas');
var apiRouter = require('./routes/api');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(function (req, res, next) {
  var origen = req.header("Origin")
  if (!origen) origen = '*'
  res.header('Access-Control-Allow-Origin', origen)
  res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept, Authorization, X-Requested-With, X-XSRF-TOKEN')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
  res.header('Access-Control-Allow-Credentials', 'true')
  next()
})

app.use(function (req, res, next) {
  res.locals.isAutenticated = false;
  if (!req.headers['authorization']) {
    next();
    return;
  }
  let token = req.headers['authorization'].substr(AUTHENTICATION_SCHEME.length)
  try {
    var decoded = jwt.verify(token, APP_SECRET);
    res.locals.isAutenticated = true;
    res.locals.usr = decoded.usr;
    res.locals.name = decoded.name;
    res.locals.roles = decoded.roles;
    next();
  } catch (err) {
    res.status(401).end();
  }
})

app.use(express.static(path.join(__dirname, 'public')));


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/demos', demosRouter);
app.use('/personas', personasRouter);
app.use('/api', apiRouter);
app.use('/files', express.static('uploads'))
app.get('/fileupload', function (req, res) {
  res.status(200).end(`
    <html><body><form action="fileupload" method="post" enctype="multipart/form-data">
      <input type="file" name="filetoupload"><input type="submit">
    </form></body></html>
  `)
})
app.post('/fileupload', function (req, res) {
  let form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {
    let newpath = __dirname + "/uploads/" + files.filetoupload.name;
    fs.copyFile(files.filetoupload.path, newpath, function (err) {
      if (err) throw err;
      newpath = "files/" + files.filetoupload.name;
      res.status(200).end(`<a href="${newpath}">${newpath}</a>`);
    });
  });
})

app.get('/db', (req, res) => {
  var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'sakila'
  })

  connection.connect()

  connection.query('SELECT * FROM `sakila`.`category`', function (err, rows, fields) {
    if (err) throw err
    res.status(200).json(rows);
  })
})

app.get('/json', (req, res) => {
  const rslt = { id: 1, nombre: "Pepito", apellidos: "Grillo" };

  res.status(200).json(rslt);
})

app.get('/google', (req, res) => {
  if (!res.headersSent)
    res.redirect(301, 'https://google.es')
  res.status(500).end();
})
app.get('/cotilla/*', (req, res, next) => {
  res.locals.di = 'algo';
  res.type('text/plain')
  //res.end();
  next();
});
app.get('/cotilla/:id/:cmd', (req, res, next) => {
  let rslt = `ID: ${req.params.id} `;
  if (req.query.page)
    rslt += `page: ${req.query.page} `;
  else {
    res.status(400).end('Falta el page');
    //throw new Error('Falta el page')
    //next(new Error('Falta el page'));
    return;
  }
  if (req.query.size) rslt += `size: ${req.query.size} `;
  if (req.get('Accept-Language')) rslt += `idioma: ${req.get('Accept-Language')} `;
  if (req.body) {
    rslt += `nombre: ${req.body.nombre} `;
    rslt += `apellidos: ${req.body.apellidos} `;
  }
  rslt += `dice: ${res.locals.di} `;
  res.status(200).end(rslt);
})
app.get('/seguro', (req, res, next) => {
  res.type('text/plain');
  if(res.locals.isAutenticated) {
    res.end(`Eres ${res.locals.usr} llamado ${res.locals.name}`);
  } else {
    res.status(401).end();
  }
});

app.post('/login', function (req, res) {
  let token = AUTHENTICATION_SCHEME + jwt.sign({
    usr: 'Admin',
    name: 'Administrador',
    roles: ['Administradores', 'Usuarios Autenticados']
  }, APP_SECRET, { expiresIn: '1h' });

  res.status(200).json({ sucess: true, token });
});


// catch 404 and forward to error handler
app.use(function (req, res, next) {
  res.status(404).end();
  //next(createError(404));
  next();
});



// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
