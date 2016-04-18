var http = require('http');
var express = require('express');
var path = require('path');
// var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var dataManager = require('../../index.js');

var app = express();
var server = http.createServer(app);


// app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());



dataManager.addDatabase({
  host: '127.0.0.1',
  user: 'tester',
  password: 'testTester',
  database: 'datamanager',
  connectionLimit: 10,
  default: true
});


dataManager.addType({
  name: 'locations',
  table: 'locations',
  attributes: {
    name: {dataType: dataManager.dataType.STRING},
    city: {dataType: dataManager.dataType.STRING},
    state: {dataType: dataManager.dataType.STRING}
  },
  relationships: [
    {
      type: 'people',
      // table: 'locations_x_people',
      // parentField: 'locations',
      // field: 'people',
      manyToMany: true
    }

    // {
    //   type: 'people', // childs type
    //   table: 'locations_x_people', // optional table for manyToMany
    //   field: 'name' // options field name for single or many

         // Option field names for many to many
    //   parentField: 'locations',

         // set one of these three
    //   single: true,
    //   many: true,
    //   manyToMany: true
    // }
  ]
});

dataManager.addType({
  name: 'people',
  table: 'people',
  attributes: {
    name: {
      dataType: 'string',
      build: [
        {field: 'first', dataType: dataManager.dataType.STRING},
        {join: ' '},
        {field: 'last', dataType: dataManager.dataType.STRING}
      ]
    },
    age: {dataType: dataManager.dataType.INT},
    email: {dataType: dataManager.dataType.STRING},
    working: {dataType: dataManager.dataType.BOOLEAN}
  },
  relationships: [
    {
      type: 'jobs',
      field: 'job',
      single: true
    }
  ]
});

dataManager.addType({
  name: 'jobs',
  table: 'jobs',
  attributes: {
    title: {dataType: dataManager.dataType.STRING},
    pay: {dataType: dataManager.dataType.CURRENCY}
  }
});




app.use('/locations', dataManager.CreateResource({
  name: 'work',
  // database
  type: 'locations',
  relationships: {
    employees: {resource: 'employees'}
  },
  postSerializer: function (data) {

    return data
  },
  complete: function (data) {

  }
}));

app.use('/people', dataManager.CreateResource({
  name: 'employees',
  type: 'people',
  relationships: {
    jobs: {resource: 'jobs'}
  }
}));

app.use('/jobs', dataManager.CreateResource({
  name: 'jobs',
  type: 'jobs'
}));






exports.listen = function () {
  server.listen.apply(server, arguments);
};

exports.close = function (callback) {
  server.close(callback);
};
