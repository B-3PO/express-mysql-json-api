var http = require('http');
var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var dataManager = require('../index.js');

var app = express();
var port = 4000;
var ipaddress = '0.0.0.0';

dataManager.addDatabase({
  host: '127.0.0.1',
  user: 'root',
  database: 'jsonapiTest',
  connectionLimit: 10,
  default: true
});


var server = http.createServer(app);
server.listen(port, ipaddress, function (){
  console.log('Server Listening on port: 4000');
});


var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
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
app.use(express.static(path.join(__dirname, '../testApp')));
app.use(express.static(path.join(__dirname, '../bower_components')));






// --- Types -------------------


dataManager.defineType({
  name: 'parents',
  table: 'parent',

  fields: {
    id: {dataType: dataManager.ID},
    uuid: {dataType: dataManager.UUID},
    name: {dataType: dataManager.STRING},
    other: {dataType: dataManager.STRING}
  },

  attributes: {
    name: 'parentName'
  },

  relationships: [
    {
      type: 'childs',
      manyToMany: true,
      table: 'parent_child',
      field: 'parent_id',
      relationField: 'child_id'
    },
    {
      type: 'cousins',
      manyToMany: true,
      table: 'parent_cousin',
      field: 'parent_id',
      relationField: 'cousin_id'
    }
  ]
});


dataManager.defineType({
  name: 'childs',
  table: 'child',

  fields: {
    id: {dataType: dataManager.ID},
    uuid: {dataType: dataManager.UUID},
    name: {dataType: dataManager.STRING},
    other: {dataType: dataManager.STRING}
  },

  attributes: {
    name: 'name',
    other: 'other'
  },

  relationships: [
    {
      type: 'parents',
      manyToMany: true,
      table: 'parent_child',
      field: 'child_id',
      relationField: 'parent_id'
    }
  ]
});

dataManager.defineType({
  name: 'cousins',
  table: 'cousins',

  fields: {
    id: {dataType: dataManager.ID},
    uuid: {dataType: dataManager.UUID},
    name: {dataType: dataManager.STRING}
  },

  attributes: {
    name: 'name',
    other: 'other'
  },

  relationships: [
    {
      type: 'parents',
      manyToMany: true,
      table: 'parent_cousin',
      field: 'cousin_id',
      relationField: 'parent_id'
    }
  ]
});







// ---- Resources -------------


app.use('/parents', dataManager.CreateResource({
  name: 'parents',
  type: 'parents',
  relationships: {
    children: 'childs',
    cousins: 'cousins'
  }
}));

app.use('/childs', dataManager.CreateResource({
  name: 'childs',
  type: 'childs'
}));

app.use('/cousins', dataManager.CreateResource({
  name: 'cousins',
  type: 'cousins'
}));
