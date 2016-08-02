var http = require('http');
var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var dataManager = require('../../index.js');
// var resourcePatch = require('./resourcePatch.js');

var app = express();
var port = 4000;
var ipaddress = '0.0.0.0';

var menus = require('./menus.js');



// var connection = mysql.createConnection({
//   host: '127.0.0.1',
//   user: 'tester',
//   password: 'testTester',
//   database: 'newAdminExamles'
// });



dataManager.addDatabase({
  host: '127.0.0.1',
  user: 'root',
  database: 'datamanager',
  connectionLimit: 10,
  default: true
});


var server = http.createServer(app);
server.listen(port, ipaddress, function (){
  console.log('Server Listening on port: 4000');
});


var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, jam-handshake, jam-version, jam-get-structure, jam-test');

    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
      res.send(200);
    }
    else {
      next();
    }
};

app.use(logger('dev'));
app.use(allowCrossDomain);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));



// menus();



dataManager.addType({
  name: 'locations',
  table: 'locations',
  attributes: {
    name: {dataType: dataManager.dataType.STRING},
    city: {dataType: dataManager.dataType.STRING},
    state: {dataType: dataManager.dataType.STRING}
  }
});

dataManager.addType({
  name: 'menus',
  table: 'menus',
  attributes: {
    name: {dataType: dataManager.dataType.STRING},
    type: {dataType: dataManager.dataType.STRING}
  }
});

dataManager.addType({
  name: 'categories',
  table: 'categories',
  attributes: {
    name: {dataType: dataManager.dataType.STRING},
    type: {dataType: dataManager.dataType.STRING}
  }
});






var locationsManager = dataManager.CreateResource({
  name: 'locations',
  type: 'locations',
  relationships: {
    menus: {
      resource: 'menus',
      manyToMany: true
    }
  }
});
app.use('/locations', locationsManager);



var menusManager = dataManager.CreateResource({
  name: 'menus',
  type: 'menus',
  relationships: {
    categories: {
      resource: 'categories',
      manyToMany: true
    }
  }
});
app.use('/menus', menusManager);



var cateogriesManager = dataManager.CreateResource({
  name: 'categories',
  type: 'categories'
});
app.use('/categories', cateogriesManager);
